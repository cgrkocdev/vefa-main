import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { apiError } from "@/lib/server/api";
import { ApiError, requestIp, requirePermission } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { normalizePhone } from "@/lib/phone";

const updateSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(30),
  phoneCountry: z.string().length(2).optional(),
  originCountry: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  amount: z.coerce.number().positive().multipleOf(0.01),
  paymentMethod: z.string().trim().min(1),
  sacrificeId: z.string().trim().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(7),
  description: z.string().max(2000).nullable().optional(),
  date: z.iso.date().optional(),
  receiptNumber: z.string().trim().min(1).max(100).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("donation:update");
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const prisma = getPrisma();
    const updated = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id },
        include: { donor: true, payment: true, receipt: true, share: true },
      });
      if (!donation || donation.status === "CANCELLED") {
        throw new ApiError(404, "Güncellenecek bağış kaydı bulunamadı.");
      }
      const paymentMethod = await tx.definition.findFirst({
        where: {
          type: "PAYMENT_METHOD",
          isActive: true,
          OR: [{ id: input.paymentMethod }, { code: input.paymentMethod }],
        },
      });
      if (!paymentMethod) throw new ApiError(422, "Ödeme yöntemi tanımı bulunamadı.");
      if (input.receiptNumber && input.receiptNumber !== donation.receipt?.number) {
        const receiptOwner = await tx.receipt.findUnique({ where: { number: input.receiptNumber } });
        if (receiptOwner) throw new ApiError(409, "Bu makbuz numarası daha önce kullanılmış.");
      }

      const normalizedPhone = normalizePhone(input.phone);
      const phoneOwner = await tx.donor.findUnique({ where: { normalizedPhone } });
      if (phoneOwner && phoneOwner.id !== donation.donorId) {
        throw new ApiError(409, "Bu telefon başka bir bağışçı tarafından kullanılıyor.");
      }
      await tx.donor.update({
        where: { id: donation.donorId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          normalizedPhone,
          originCountry: input.originCountry || null,
          originCity: input.city || null,
          originDistrict: input.district || null,
          phoneCountry: input.phoneCountry ?? (normalizedPhone.startsWith("+90") ? "TR" : donation.donor.phoneCountry),
        },
      });

      const targetProjectId = input.sacrificeId ?? donation.projectId;
      let targetShareId = donation.share?.id ?? null;
      if (donation.projectId !== targetProjectId) {
        if (!targetProjectId) throw new ApiError(422, "Kurban bağışı için proje seçimi zorunludur.");
        const targetShare = await tx.share.findFirst({
          where: { projectId: targetProjectId, status: "EMPTY" },
          orderBy: { shareNumber: "asc" },
        });
        if (!targetShare) throw new ApiError(409, "Seçilen projede boş hisse bulunamadı.");
        if (donation.share) {
          await tx.share.update({
            where: { id: donation.share.id },
            data: { donationId: null, status: "EMPTY", version: { increment: 1 } },
          });
        }
        const claimed = await tx.share.updateMany({
          where: { id: targetShare.id, status: "EMPTY", version: targetShare.version },
          data: { donationId: id, status: "FILLED", version: { increment: 1 } },
        });
        if (claimed.count !== 1) throw new ApiError(409, "Hisse başka bir işlem tarafından dolduruldu.");
        targetShareId = targetShare.id;
      }
      const result = await tx.donation.update({
        where: { id },
        data: {
          amount: new Prisma.Decimal(input.amount),
          paymentMethodId: paymentMethod.id,
          projectId: targetProjectId,
          quantity: input.quantity,
          description: input.description || null,
          createdAt: input.date ? new Date(`${input.date}T12:00:00.000Z`) : donation.createdAt,
        },
      });
      if (donation.payment) {
        await tx.payment.update({
          where: { donationId: id },
          data: {
            amount: new Prisma.Decimal(input.amount),
            methodId: paymentMethod.id,
          },
        });
      }
      if (input.receiptNumber) {
        if (donation.receipt) {
          await tx.receipt.update({ where: { donationId: id }, data: { number: input.receiptNumber, issuedAt: input.date ? new Date(`${input.date}T12:00:00.000Z`) : donation.receipt.issuedAt } });
        } else {
          await tx.receipt.create({ data: { donationId: id, number: input.receiptNumber, issuedAt: input.date ? new Date(`${input.date}T12:00:00.000Z`) : new Date() } });
        }
      }
      if (donation.projectId && donation.projectId !== targetProjectId) {
        await tx.project.updateMany({
          where: { id: donation.projectId, status: "FULL" },
          data: { status: "OPEN" },
        });
      }
      if (targetProjectId && await tx.share.count({ where: { projectId: targetProjectId, status: "EMPTY" } }) === 0) {
        await tx.project.update({ where: { id: targetProjectId }, data: { status: "FULL" } });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DONATION_UPDATED",
          entityType: "Donation",
          entityId: id,
          oldValue: {
            firstName: donation.donor.firstName,
            lastName: donation.donor.lastName,
            phone: donation.donor.normalizedPhone,
            city: donation.donor.originCity,
            district: donation.donor.originDistrict,
            amount: donation.amount.toString(),
            paymentMethodId: donation.paymentMethodId,
            projectId: donation.projectId,
            quantity: donation.quantity,
            description: donation.description,
            shareId: donation.share?.id ?? null,
          },
          newValue: {
            ...input,
            phone: normalizedPhone,
            paymentMethodId: paymentMethod.id,
            projectId: targetProjectId,
            shareId: targetShareId,
          },
          ipAddress: await requestIp(),
        },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ donation: { ...updated, amount: updated.amount.toString() } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("donation:delete");
    const { id } = await params;
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id },
        include: { share: true, payment: true },
      });
      if (!donation) throw new ApiError(404, "Bağış kaydı bulunamadı.");
      if (donation.status === "CANCELLED") {
        throw new ApiError(409, "Bağış kaydı zaten iptal edilmiş.");
      }

      if (donation.share) {
        await tx.share.update({
          where: { id: donation.share.id },
          data: {
            donationId: null,
            status: "EMPTY",
            version: { increment: 1 },
          },
        });
      }
      if (donation.payment) {
        await tx.payment.update({
          where: { donationId: donation.id },
          data: { status: "CANCELLED" },
        });
      }
      await tx.donation.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancellationReason: "Proje listesinden kullanıcı tarafından silindi.",
        },
      });
      if (donation.projectId) {
        await tx.project.updateMany({
          where: { id: donation.projectId, status: "FULL" },
          data: { status: "OPEN" },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DONATION_CANCELLED",
          entityType: "Donation",
          entityId: id,
          oldValue: {
            status: donation.status,
            amount: donation.amount.toString(),
            shareId: donation.share?.id ?? null,
          },
          newValue: { status: "CANCELLED" },
          ipAddress: await requestIp(),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
