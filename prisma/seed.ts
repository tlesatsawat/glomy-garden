import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Upsert Crops
  // Using upsert ensures we don't create duplicates on re-runs
  const turnip = await prisma.cropMaster.upsert({
    where: { name: 'Turnip' },
    update: {},
    create: {
      name: 'Turnip',
      description: 'A humble root vegetable. Fast to grow.',
      growthTime: 10, // 10 seconds (Fast for demo)
      buyPrice: 10,
      sellPrice: 20,
      experience: 5,
      emoji: '🥔',
      // spriteUrl: '/sprites/turnip.png' // Ready for sprite mode
    },
  })

  const carrot = await prisma.cropMaster.upsert({
    where: { name: 'Carrot' },
    update: {},
    create: {
      name: 'Carrot',
      description: 'Orange and crunchy. Bunnies love it.',
      growthTime: 30,
      buyPrice: 25,
      sellPrice: 60,
      experience: 15,
      emoji: '🥕',
    },
  })

  const pumpkin = await prisma.cropMaster.upsert({
    where: { name: 'Pumpkin' },
    update: {},
    create: {
      name: 'Pumpkin',
      description: 'Takes a while, but worth the weight.',
      growthTime: 60,
      buyPrice: 50,
      sellPrice: 150,
      experience: 40,
      emoji: '🎃',
    },
  })

  // 2. Upsert AI Agents
  const peasant = await prisma.aIMaster.upsert({
    where: { id: 'ai-peasant-001' }, // Use fixed UUIDs for masters if preferred
    update: {},
    create: {
      name: 'Peasant Helper',
      role: 'FARMER',
      cost: 500,
      speed: 1.0,
      efficiency: 1.0,
    },
  })

  // 3. Create Initial Event
  const welcomeEvent = await prisma.event.create({
    data: {
      name: 'Grand Opening',
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
      config: { goldMultiplier: 1.5 },
      isActive: true
    }
  })

  console.log({ turnip, carrot, pumpkin, peasant, welcomeEvent })
  console.log('✅ Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })