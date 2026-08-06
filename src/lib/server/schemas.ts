import { z } from "zod";

export const definitionTypeSchema = z.enum([
  "DEPARTMENT", "YEAR", "DONATION_TYPE", "DONATION_GROUP", "ORIGIN_COUNTRY",
  "ORIGIN_CITY", "ORIGIN_DISTRICT", "DESTINATION_COUNTRY", "DESTINATION_REGION",
  "PARTNER", "REPRESENTATIVE", "PAYMENT_METHOD", "CURRENCY", "ORGANIZATION",
  "MESSAGE_TEMPLATE", "PROJECT_STATUS", "SHARE_STATUS", "UNIT_TYPE", "GENERAL_DONATION_GROUP",
]);

export const definitionInputSchema = z.object({
  type: definitionTypeSchema,
  code: z.string().trim().min(1).max(50).transform((value) => value.toLocaleUpperCase("tr-TR").replace(/\s+/g, "_")),
  name: z.string().trim().min(2).max(120),
  symbol: z.string().trim().max(10).nullable().optional(),
  parentId: z.string().cuid().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable().optional(),
});

export const projectInputSchema = z.object({
  yearId: z.string().cuid(),
  departmentId: z.string().cuid(),
  typeId: z.string().cuid(),
  groupId: z.string().cuid(),
  destinationCountryId: z.string().cuid(),
  partnerId: z.string().cuid().nullable().optional(),
  destinationRegionId: z.string().cuid(),
  projectNumber: z.coerce.number().int().positive(),
  name: z.string().trim().min(3).max(180),
  animalType: z.enum(["CATTLE", "SMALL_ANIMAL"]),
  shareCapacity: z.coerce.number().int().min(1).max(100),
  sharePrice: z.coerce.number().positive().multipleOf(0.01),
  currencyId: z.string().cuid(),
  isVirtual: z.boolean().default(false),
  status: z.enum(["DRAFT", "OPEN", "FULL", "COMPLETED", "CLOSED", "CANCELLED"]).default("DRAFT"),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const sacrificeDonationInputSchema = z.object({
  idempotencyKey: z.uuid(),
  donor: z.object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30),
    phoneCountry: z.string().length(2),
    closePhone: z.string().trim().max(30).nullable().optional(),
    originCountry: z.string().trim().max(80).nullable().optional(),
    originCity: z.string().trim().max(80).nullable().optional(),
    originDistrict: z.string().trim().max(80).nullable().optional(),
  }),
  projectId: z.string().cuid(),
  shareNumber: z.coerce.number().int().positive().optional(),
  typeId: z.string().cuid(),
  groupId: z.string().cuid(),
  amount: z.coerce.number().positive().multipleOf(0.01),
  foreignAmount: z.coerce.number().nonnegative().multipleOf(0.01).nullable().optional(),
  currencyId: z.string().cuid(),
  paymentMethodId: z.string().cuid(),
  receiptNumber: z.string().trim().min(1).max(100),
  receiptDate: z.coerce.date(),
  description: z.string().trim().max(1000).nullable().optional(),
  messageTarget: z.enum(["DONOR", "CLOSE"]).default("DONOR"),
  sendWhatsapp: z.boolean().default(false),
  sendSms: z.boolean().default(false),
  currencySms: z.boolean().default(false),
  messageTemplateId: z.string().cuid().nullable().optional(),
});
