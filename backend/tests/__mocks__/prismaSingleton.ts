const modelProxy = new Proxy({}, {
  get: () => jest.fn(),
});

let prisma: any;

prisma = new Proxy({
  $queryRaw: jest.fn().mockResolvedValue([]),
  $executeRaw: jest.fn().mockResolvedValue(0),
  $transaction: jest.fn(async (callback: any): Promise<any> => callback(prisma)),
}, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target];
    }
    return modelProxy;
  },
});

export default prisma;
