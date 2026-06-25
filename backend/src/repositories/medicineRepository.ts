import prisma from '../lib/prisma.js';

export async function searchMedicines(opts: {
  category?: string;
  query?:    string;
  limit:     number;
  offset:    number;
}) {
  const where: any = {};
  if (opts.category) where.category = opts.category;
  if (opts.query) {
    where.OR = [
      { brandNameAr: { contains: opts.query, mode: 'insensitive' } },
      { brandNameEn: { contains: opts.query, mode: 'insensitive' } },
      { activeIngredient: { contains: opts.query, mode: 'insensitive' } },
    ];
  }
  const [data, total] = await Promise.all([
    prisma.medicine.findMany({ where, take: opts.limit, skip: opts.offset }),
    prisma.medicine.count({ where }),
  ]);
  return { data, total };
}

export async function getMedicineById(id: string) {
  return prisma.medicine.findUnique({ where: { id } });
}

export async function getCategories(): Promise<string[]> {
  const result = await prisma.medicine.findMany({
    select:   { category: true },
    distinct: ['category'],
  });
  return result.map(r => r.category);
}

export async function getPatientConditions(patientId: string): Promise<string[]> {
  const rows = await prisma.patientCondition.findMany({
    where:  { patientId },
    select: { condition: true },
  });
  return rows.map(r => r.condition);
}

export async function setPatientConditions(
  patientId:  string,
  conditions: string[],
  source:     string
) {
  await prisma.patientCondition.deleteMany({
    where: { patientId, source },
  });
  if (conditions.length === 0) return;
  await prisma.patientCondition.createMany({
    data: conditions.map(condition => ({
      patientId,
      condition,
      source,
    })),
  });
}

export async function getDrugbankDrug(drugbankId: string) {
  return prisma.drugbankDrug.findUnique({
    where: { drugbankId },
  });
}
