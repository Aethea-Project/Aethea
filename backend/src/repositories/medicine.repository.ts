import { PrismaClient } from '../generated/prisma/index.js';

export class MedicineRepository {
  constructor(private prisma: PrismaClient) {}

  async searchMedicines(opts: {
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
      this.prisma.medicine.findMany({ where, take: opts.limit, skip: opts.offset }),
      this.prisma.medicine.count({ where }),
    ]);
    return { data, total };
  }

  async getMedicineById(id: string) {
    return this.prisma.medicine.findUnique({ where: { id } });
  }

  async getCategories(): Promise<string[]> {
    const result = await this.prisma.medicine.findMany({
      select:   { category: true },
      distinct: ['category'],
    });
    return result.map(r => r.category);
  }

  async getPatientConditions(patientId: string): Promise<string[]> {
    const rows = await this.prisma.patientCondition.findMany({
      where:  { patientId },
      select: { condition: true },
    });
    return rows.map(r => r.condition);
  }

  async setPatientConditions(
    patientId:  string,
    conditions: string[],
    source:     string
  ) {
    await this.prisma.patientCondition.deleteMany({
      where: { patientId, source },
    });
    if (conditions.length === 0) return;
    await this.prisma.patientCondition.createMany({
      data: conditions.map(condition => ({
        patientId,
        condition,
        source,
      })),
    });
  }

  async getDrugbankDrug(drugbankId: string) {
    return this.prisma.drugbankDrug.findUnique({
      where: { drugbankId },
    });
  }
}

