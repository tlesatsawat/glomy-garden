import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateCropState } from '@/lib/game-logic';
import { SyncResponse, FullUser } from '@/lib/types';
import { SlotStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    // 1. Get or Create User (Transaction to ensure data integrity)
    // This acts as a simple auth/session init for this demo
    const user = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { username },
        include: {
          wallet: true,
          farmSlots: {
            orderBy: { gridIndex: 'asc' },
            include: {
              crop: {
                include: { master: true }
              }
            }
          },
          aiAgents: {
            include: { master: true }
          }
        }
      });

      // Initialize New User
      if (!user) {
        user = await tx.user.create({
          data: {
            username,
            wallet: {
              create: { gold: 100, gems: 0 }
            },
            farmSlots: {
              createMany: {
                // Give 6 free slots, unlocked
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
            aiAgents: {
              include: { master: true }
            }
          }
        });
      }

      return user;
    });

    // 2. Offline Calculation (Server-Side Authority)
    const now = Date.now();
    const updatePromises: Promise<any>[] = [];

    user.farmSlots.forEach((slot) => {
      if (slot.crop && !slot.crop.isWithered) {
        // Calculate state based on time elapsed
        const state = calculateCropState(
          slot.crop.plantedAt,
          slot.crop.master.growthTime,
          now
        );

        // If crop withered while offline, update DB
        if (state.isWithered) {
          updatePromises.push(
            prisma.cropInstance.update({
              where: { id: slot.crop.id },
              data: { isWithered: true }
            })
          );
          // Update in-memory object for response
          slot.crop.isWithered = true;
        }
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // 3. Construct Response
    const response: SyncResponse = {
      user: user as unknown as FullUser, // Type assertion for joined relations
      serverTime: now,
      events: [] // Placeholder for active events
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: now
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', timestamp: Date.now() }, 
      { status: 500 }
    );
  }
}