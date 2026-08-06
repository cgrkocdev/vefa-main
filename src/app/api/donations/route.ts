import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { apiError } from "@/lib/server/api";
import { ApiError, requestIp, requirePermission } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { normalizePhone } from "@/lib/phone";
import { validateGeneralDonationDefinitions } from "@/lib/server/definition-integrity";
import { getSmsProvider } from "@/lib/sms";

export async function GET() {
  try {
    await requirePermission("donation:view");
    const prisma = getPrisma();
    const donations = await prisma.donation.findMany({
      where: { status: "COMPLETED" },
      include: { donor: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const typeIds = [...new Set(donations.map((item) => item.typeId))];
    const types = await prisma.definition.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true },
    });
    const typeNames = new Map(types.map((item) => [item.id, item.name]));
    return Response.json({
      donations: donations.map((item) => ({
        id: item.id,
        donorName: `${item.donor.firstName} ${item.donor.lastName}`,
        type: typeNames.get(item.typeId) ?? "Bağış",
        amount: Number(item.amount),
        createdAt: item.createdAt.toISOString(),
        status: item.status,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

const createSchema = z.object({
  donorName: z.string().trim().min(2),
  phone: z.string().min(7),
  type: z.string().min(1),
  amount: z.coerce.number().positive(),
  paymentMethod: z.string().min(1),
  description: z.string().optional(),
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phoneCountry: z.string().length(2).optional(),
  originCountry: z.string().trim().max(80).nullable().optional(),
  originCity: z.string().trim().max(80).nullable().optional(),
  originDistrict: z.string().trim().max(80).nullable().optional(),
  groupId: z.string().cuid().nullable().optional(),
  destinationCountryId: z.string().cuid().nullable().optional(),
  destinationRegionId: z.string().cuid().nullable().optional(),
  partnerId: z.string().cuid().nullable().optional(),
  unitType: z.string().trim().max(80).nullable().optional(),
  unitPrice: z.coerce.number().positive().multipleOf(0.01).nullable().optional(),
  foreignAmount: z.coerce.number().nonnegative().multipleOf(0.01).nullable().optional(),
  proxyOwner: z.string().trim().max(160).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  specialCondition: z.boolean().default(false),
  orderStatus: z.boolean().default(false),
  smsProvider: z.string().trim().max(50).nullable().optional(),
  currencySms: z.boolean().default(false),
  sendSms: z.boolean().default(false),
  receiptDate: z.coerce.date().optional(),
  receiptNo: z.string().trim().min(1, "Makbuz numarası zorunludur.").max(80),
  currency: z.string().trim().min(1).max(20).default("TRY"),
  sacrificeId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(7).default(1),
  sendWhatsapp: z.boolean().default(false),
  idempotencyKey: z.uuid(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("donation:create");
    const input = createSchema.parse(await request.json());
    const prisma = getPrisma();
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.donation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (duplicate) return { donation: duplicate, count: 1, duplicate: true, sms: null };

      const [type, method, currency] = await Promise.all([
        tx.definition.findFirst({
          where: {
            type: "DONATION_TYPE",
            isActive: true,
            OR: [
              { name: input.type },
              { code: input.type.toLocaleUpperCase("tr-TR").replace(/\s+/g, "_") },
            ],
          },
        }),
        tx.definition.findFirst({
          where: {
            type: "PAYMENT_METHOD",
            isActive: true,
            OR: [{ code: input.paymentMethod }, { name: input.paymentMethod }],
          },
        }),
        tx.definition.findFirst({
          where: {
            type: "CURRENCY",
            isActive: true,
            OR: [{ code: input.currency }, { id: input.currency }],
          },
        }),
      ]);
      if (!type || !method || !currency) {
        throw new ApiError(422, "Bağış türü, ödeme yöntemi veya para birimi tanımı eksik.");
      }
      if (type.code === "KURBAN") {
        throw new ApiError(422, "Kurban bağışları proje ve hisse bütünlüğü için Kurban Bağış formundan kaydedilmelidir.");
      }
      await validateGeneralDonationDefinitions(tx, { ...input, typeId: type.id });
      const existingReceipt = await tx.receipt.findUnique({ where: { number: input.receiptNo } });
      if (existingReceipt) throw new ApiError(409, "Bu makbuz numarası daha önce kullanılmıştır. Farklı bir numara girin.");

      const normalizedPhone = normalizePhone(input.phone);
      const nameParts = input.donorName.trim().split(/\s+/);
      const firstName = input.firstName ?? nameParts.shift() ?? input.donorName;
      const lastName = input.lastName ?? (nameParts.join(" ") || "-");
      const donor = await tx.donor.upsert({
        where: { normalizedPhone },
        update: {
          firstName,
          lastName,
          phoneCountry: input.phoneCountry ?? (normalizedPhone.startsWith("+90") ? "TR" : "XX"),
          originCountry: input.originCountry,
          originCity: input.originCity,
          originDistrict: input.originDistrict,
        },
        create: {
          normalizedPhone,
          firstName,
          lastName,
          phoneCountry: input.phoneCountry ?? (normalizedPhone.startsWith("+90") ? "TR" : "XX"),
          originCountry: input.originCountry,
          originCity: input.originCity,
          originDistrict: input.originDistrict,
        },
      });

      const donations = [];
      const receipts: string[] = [];
      for (const index of [0]) {
        const receipt = input.receiptNo;
        const donation = await tx.donation.create({
          data: {
            donorId: donor.id,
            projectId: null,
            createdById: user.id,
            typeId: type.id,
            amount: new Prisma.Decimal(input.amount),
            foreignAmount: input.foreignAmount == null ? null : new Prisma.Decimal(input.foreignAmount),
            currencyId: currency.id,
            paymentMethodId: method.id,
            groupId: input.groupId,
            destinationCountryId: input.destinationCountryId,
            destinationRegionId: input.destinationRegionId,
            partnerId: input.partnerId,
            unitType: input.unitType,
            unitPrice: input.unitPrice == null ? null : new Prisma.Decimal(input.unitPrice),
            quantity: input.quantity,
            description: input.description,
            proxyOwner: input.proxyOwner,
            address: input.address,
            specialCondition: input.specialCondition,
            orderStatus: input.orderStatus,
            smsProvider: input.smsProvider,
            currencySms: input.currencySms,
            createdAt: input.receiptDate,
            idempotencyKey: index === 0
              ? input.idempotencyKey
              : `${input.idempotencyKey}-${index + 1}`,
            payment: {
              create: {
                amount: new Prisma.Decimal(input.amount),
                currencyId: currency.id,
                methodId: method.id,
                status: "PAID",
              },
            },
            receipt: { create: { number: receipt, issuedAt: input.receiptDate ?? new Date() } },
          },
        });

        donations.push(donation);
        receipts.push(receipt);
      }

      const donation = donations[0];
      if (input.sendWhatsapp) {
        await tx.message.create({
          data: {
            donationId: donation.id,
            channel: "WHATSAPP",
            recipient: normalizedPhone,
            renderedBody: `Sayın ${input.donorName}, ${input.quantity} adet ${input.amount.toLocaleString("tr-TR")} ₺ tutarında bağışınız alınmıştır. Makbuzlar: ${receipts.join(", ")}`,
            status: process.env.WHATSAPP_ACCESS_TOKEN ? "PENDING" : "FAILED",
            errorMessage: process.env.WHATSAPP_ACCESS_TOKEN
              ? null
              : "WhatsApp sağlayıcısı yapılandırılmadı.",
          },
        });
      }
      let sms: { id: string; phone: string; message: string } | null = null;
      if (input.sendSms) {
        const smsMessage = await tx.message.create({
          data: {
            donationId: donation.id,
            channel: "SMS",
            recipient: normalizedPhone,
            provider: process.env.SMS_PROVIDER === "twilio" ? "Twilio" : "Yedirenk Demo SMS",
            renderedBody: `Sayın ${input.donorName}, ${input.amount.toLocaleString("tr-TR")} ₺ tutarındaki bağışınız alınmıştır. Makbuz: ${receipts[0]}`,
            status: "PENDING",
          },
        });
        sms = { id: smsMessage.id, phone: normalizedPhone, message: smsMessage.renderedBody };
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DONATION_CREATED",
          entityType: "Donation",
          entityId: donation.id,
          newValue: {
            amount: input.amount,
            quantity: input.quantity,
            type: input.type,
            receipts,
          },
          ipAddress: await requestIp(),
        },
      });
      return { donation, count: donations.length, duplicate: false, sms };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.sms) {
      const provider = getSmsProvider();
      const sent = await provider.sendSms({ phone: result.sms.phone, message: result.sms.message });
      await prisma.message.update({ where: { id: result.sms.id }, data: { status: sent.success ? "SENT" : "FAILED", providerKey: sent.providerId, errorMessage: sent.errorMessage, sentAt: sent.success ? new Date() : null } });
      await prisma.auditLog.create({ data: { userId: user.id, action: sent.success ? "SMS_SENT" : "SMS_FAILED", entityType: "Message", entityId: result.sms.id, newValue: { provider: provider.name, recipient: result.sms.phone } } });
    }

    return Response.json({
      donation: {
        ...result.donation,
        donorName: input.donorName,
        type: input.type,
        amount: Number(result.donation.amount),
      },
      count: result.count,
      duplicate: result.duplicate,
    }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}
