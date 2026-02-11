import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCropState } from '@/lib/game-logic';
import { SyncResponse, FullUser } from '@/lib/types';
import { SlotStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    // 1. Validation check
    const body = await req.json().catch(() => ({}));
    const { username } = body;

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    // 2. Database Connectivity & Transaction
    const user = await prisma.$transaction(async (tx) => {
      let userRecord = await tx.user.findUnique({
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

      // Initialize New User if not found
      if (!userRecord) {
        userRecord = await tx.user.create({
          data: {
            username,
            wallet: { create: { gold: 100, gems: 0 } },
            farmSlots: {
              createMany: {
                data: Array.from({ length: 6 }).map((_, i) => ({
                  gridIndex: i,
                  status: SlotStatus.EMPTY
                }))
              }
            }
          },
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
      }

      return userRecord;
    }, {
      timeout: 10000 // 10s timeout for DB operations
    });

    // 3. Offline Calculation
    const now = Date.now();
    const updatePromises: Promise<any>[] = [];

    user.farmSlots.forEach((slot) => {
      if (slot.crop && !slot.crop.isWithered) {
        const state = calculateCropState(
          slot.crop.plantedAt,
          slot.crop.master.growthTime,
          now
        );

        if (state.isWithered) {
          updatePromises.push(
            prisma.cropInstance.update({
              where: { id: slot.crop.id },
              data: { isWithered: true }
            })
          );
          slot.crop.isWithered = true;
        }
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    const response: SyncResponse = {
      user: user as unknown as FullUser,
      serverTime: now,
      events: []
    };

    return NextResponse.json({ success: true, data: response });

  } catch (error: any) {
    // Detailed logging for debugging in the terminal
    console.error('[SYNC_ERROR]:', error.message);
    
    // Check for Prisma initialization errors
    if (error.code === 'P2021' || error.code === 'P2022') {
      return NextResponse.json({ 
        success: false, 
        error: 'Database tables not found. Did you run migrations?' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
