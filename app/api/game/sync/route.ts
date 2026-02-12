import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCropState } from '@/lib/game-logic';
import { SyncResponse, FullUser } from '@/lib/types';
import { SlotStatus } from '@prisma/client';

export async function POST(req: Request) {
  const timestamp = Date.now();
  
  try {
    // 1. Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body || !body.username) {
      return NextResponse.json(
        { success: false, error: 'Username is required', timestamp }, 
        { status: 400 }
      );
    }

    const { username } = body;

    // 2. Database Transaction with enhanced error handling
    // We use a transaction to ensure User, Wallet, and Slots are created together
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

      // If user doesn't exist, perform auto-provisioning
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
      timeout: 15000 // Extended timeout for cold-start databases on Vercel
    });

    if (!user) {
      throw new Error('Failed to retrieve or create user record');
    }

    // 3. Offline Growth Calculation (Server-Authoritative)
    const updatePromises: Promise<any>[] = [];
    const farmSlots = user.farmSlots as any[];

    for (const slot of farmSlots) {
      // Defensive check: Ensure crop and master exist before calculation
      if (slot.crop && slot.crop.master && !slot.crop.isWithered) {
        const state = calculateCropState(
          slot.crop.plantedAt,
          slot.crop.master.growthTime,
          timestamp
        );

        if (state.isWithered) {
          updatePromises.push(
            prisma.cropInstance.update({
              where: { id: slot.crop.id },
              data: { isWithered: true }
            })
          );
          slot.crop.isWithered = true; // Update local object for immediate response
        }
      }
    }

    // Execute updates in parallel to save time
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // 4. Construct Response
    const responseData: SyncResponse = {
      user: user as unknown as FullUser,
      serverTime: timestamp,
      events: []
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp
    });

  } catch (error: any) {
    // Comprehensive Error Logging for Production Debugging
    console.error('[SYNC_CRITICAL_ERROR]:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle specific Prisma errors
    if (error.code === 'P2021' || error.code === 'P2022') {
      return NextResponse.json({ 
        success: false, 
        error: 'Database schema mismatch. Please run migrations.',
        timestamp 
      }, { status: 500 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false, 
        error: 'Conflict in user creation. Please try again.',
        timestamp 
      }, { status: 409 });
    }

    // Generic fallback for unexpected errors
    return NextResponse.json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
      timestamp 
    }, { status: 500 });
  }
}
