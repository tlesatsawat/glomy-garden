import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCropState, calculateSellPrice } from '@/lib/game-logic';
import { GameActionPayload, SyncResponse, FullUser } from '@/lib/types';
import { SlotStatus, TransactionType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, payload } = body as { username: string; payload: GameActionPayload };

    if (!username || !payload) {
      return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }

    // Execute logic inside a transaction to ensure Economy Consistency
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Fetch User & Current State
      const user = await tx.user.findUnique({
        where: { username },
        include: {
          wallet: true,
          farmSlots: {
            include: { crop: { include: { master: true } } }
          }
        }
      });

      if (!user || !user.wallet) throw new Error('User not found');

      // 2. Handle Actions
      switch (payload.action) {
        case 'PLANT': {
            const { slotId, cropMasterId } = payload;
            if (!slotId || !cropMasterId) throw new Error('Missing parameters');

            const slot = user.farmSlots.find(s => s.id === slotId);
            if (!slot) throw new Error('Slot not found');
            if (slot.status !== SlotStatus.EMPTY) throw new Error('Slot not empty');

            const cropMaster = await tx.cropMaster.findUnique({ where: { id: cropMasterId } });
            if (!cropMaster) throw new Error('Crop type not found');

            // Economy Check
            if (user.wallet.gold < cropMaster.buyPrice) {
                throw new Error('Insufficient Gold');
            }

            // Deduct Gold
            await tx.wallet.update({
                where: { userId: user.id },
                data: { gold: { decrement: cropMaster.buyPrice } }
            });

            await tx.transactionLog.create({
                data: {
                    walletId: user.wallet.id,
                    type: TransactionType.SEED_PURCHASE,
                    amount: -cropMaster.buyPrice,
                    metadata: { cropName: cropMaster.name }
                }
            });

            // Plant Crop
            await tx.farmSlot.update({
                where: { id: slotId },
                data: {
                    status: SlotStatus.PLANTED,
                    crop: {
                        create: {
                            masterId: cropMasterId,
                            plantedAt: new Date(),
                            // Calculate expected harvest time for indexing/queries
                            harvestableAt: new Date(Date.now() + cropMaster.growthTime * 1000)
                        }
                    }
                }
            });
            break;
        }

        case 'HARVEST': {
            const { slotId } = payload;
            if (!slotId) throw new Error('Missing slotId');

            const slot = user.farmSlots.find(s => s.id === slotId);
            if (!slot || !slot.crop) throw new Error('Nothing to harvest');

            // Anti-Cheat: Validate Growth Time on Server
            const now = Date.now();
            const cropState = calculateCropState(
                slot.crop.plantedAt,
                slot.crop.master.growthTime,
                now
            );

            if (!cropState.isReady) {
                // Determine if it's withered
                if (cropState.isWithered) {
                    // Remove withered crop, no refund
                    await tx.cropInstance.delete({ where: { id: slot.crop.id } });
                    await tx.farmSlot.update({
                        where: { id: slotId },
                        data: { status: SlotStatus.EMPTY }
                    });
                    return; // Return early, logic ends here for withered
                }
                throw new Error('Crop not ready yet');
            }

            // Calculate Reward
            const sellPrice = calculateSellPrice(slot.crop.master.sellPrice);

            // Add Gold
            await tx.wallet.update({
                where: { userId: user.id },
                data: { gold: { increment: sellPrice } }
            });

            await tx.transactionLog.create({
                data: {
                    walletId: user.wallet.id,
                    type: TransactionType.CROP_SALE,
                    amount: sellPrice,
                    metadata: { cropName: slot.crop.master.name }
                }
            });

            // Clean up Crop
            await tx.cropInstance.delete({ where: { id: slot.crop.id } });
            await tx.farmSlot.update({
                where: { id: slotId },
                data: { status: SlotStatus.EMPTY }
            });
            break;
        }
        
        default:
            throw new Error('Unknown Action');
      }

      // 3. Return Fresh State
      return await tx.user.findUnique({
        where: { username },
        include: {
            wallet: true,
            farmSlots: {
                orderBy: { gridIndex: 'asc' },
                include: {
                    crop: { include: { master: true } }
                }
            },
            aiAgents: { include: { master: true } }
        }
      });
    });

    const response: SyncResponse = {
        user: updatedUser as unknown as FullUser,
        serverTime: Date.now(),
        events: []
    };

    return NextResponse.json({ success: true, data: response });

  } catch (error: any) {
    console.error('Action Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Action failed' }, 
      { status: 400 }
    );
  }
}