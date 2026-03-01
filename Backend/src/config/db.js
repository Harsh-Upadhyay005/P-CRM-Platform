import { PrismaClient } from "../../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const _client  = new PrismaClient({ adapter });

const SOFT_DELETE_MODELS = new Set(["User", "Department", "Complaint"]);

const FILTER_READ_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

const prisma = _client.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);

        if (FILTER_READ_OPS.has(operation)) {
          args.where = { ...(args.where ?? {}), isDeleted: false };
          return query(args);
        }

        if (operation === "findUnique" || operation === "findUniqueOrThrow") {
          const result = await query(args);
          if (result?.isDeleted === true) {
            if (operation === "findUniqueOrThrow") {
              const err = new Error(`No ${model} record found`);
              err.code  = "P2025";
              throw err;
            }
            return null;
          }
          return result;
        }

        return query(args);
      },
    },
  },
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };
