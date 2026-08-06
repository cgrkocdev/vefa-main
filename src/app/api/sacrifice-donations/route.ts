import { Prisma } from "@/generated/prisma/client";
import { apiError } from "@/lib/server/api";
import { ApiError, requestIp, requirePermission } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { normalizePhone } from "@/lib/phone";
import { sacrificeDonationInputSchema } from "@/lib/server/schemas";
import { requireDefinitions } from "@/lib/server/definition-integrity";
import { getSmsProvider } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("donation:create");
    const input = sacrificeDonationInputSchema.parse(await request.json());
    const normalizedPhone = normalizePhone(input.donor.phone);
    const prisma = getPrisma();
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.donation.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { receipt: true } });
      if (duplicate) return { donation: duplicate, sms: null };
      const duplicateReceipt = await tx.receipt.findUnique({ where: { number: input.receiptNumber } });
      if (duplicateReceipt) throw new ApiError(409, "Bu makbuz numarası daha önce kullanılmış.");
      const project = await tx.project.findUnique({ where: { id: input.projectId } });
      if (!project || project.deletedAt || project.status !== "OPEN") throw new ApiError(409, "Proje bağış kabulüne açık değil.");
      await requireDefinitions(tx, [
        { id: input.typeId, type: "DONATION_TYPE", label: "Bağış türü" },
        { id: input.groupId, type: "DONATION_GROUP", label: "Bağış grubu" },
        { id: input.currencyId, type: "CURRENCY", label: "Para birimi" },
        { id: input.paymentMethodId, type: "PAYMENT_METHOD", label: "Ödeme yöntemi" },
      ]);
      if (input.typeId !== project.typeId || input.groupId !== project.groupId || input.currencyId !== project.currencyId) {
        throw new ApiError(422, "Bağış türü, grubu veya para birimi seçilen projeyle uyuşmuyor.");
      }
      const share = input.shareNumber
        ? await tx.share.findUnique({ where: { projectId_shareNumber: { projectId: project.id, shareNumber: input.shareNumber } } })
        : await tx.share.findFirst({ where: { projectId: project.id, status: "EMPTY" }, orderBy: { shareNumber: "asc" } });
      if (!share || share.status !== "EMPTY") throw new ApiError(409, "Seçilen hisse artık boş değil.");
      const donor = await tx.donor.upsert({
        where: { normalizedPhone },
        update: {
          firstName: input.donor.firstName,
          lastName: input.donor.lastName,
          phoneCountry: input.donor.phoneCountry,
          closePhone: input.donor.closePhone,
          originCountry: input.donor.originCountry,
          originCity: input.donor.originCity,
          originDistrict: input.donor.originDistrict,
          normalizedPhone,
        },
        create: {
          firstName: input.donor.firstName,
          lastName: input.donor.lastName,
          phoneCountry: input.donor.phoneCountry,
          closePhone: input.donor.closePhone,
          originCountry: input.donor.originCountry,
          originCity: input.donor.originCity,
          originDistrict: input.donor.originDistrict,
          normalizedPhone,
        },
      });
      const settings = await tx.appSetting.findUnique({ where: { key: "organization" } });
      const settingValue = settings?.value && typeof settings.value === "object" && !Array.isArray(settings.value) ? settings.value as Record<string, unknown> : {};
      const created = await tx.donation.create({
        data: {
          donorId: donor.id,
          projectId: project.id,
          createdById: user.id,
          typeId: input.typeId,
          groupId: input.groupId,
          amount: new Prisma.Decimal(input.amount),
          foreignAmount: input.foreignAmount == null ? null : new Prisma.Decimal(input.foreignAmount),
          currencyId: input.currencyId,
          paymentMethodId: input.paymentMethodId,
          description: input.description,
          messageTarget: input.messageTarget,
          idempotencyKey: input.idempotencyKey,
          payment: { create: { amount: new Prisma.Decimal(input.amount), currencyId: input.currencyId, methodId: input.paymentMethodId, status: "PAID" } },
          receipt: { create: { number: input.receiptNumber, issuedAt: input.receiptDate } },
        },
        include: { receipt: true },
      });
      const claimed = await tx.share.updateMany({
        where: { id: share.id, status: "EMPTY", version: share.version },
        data: { status: "FILLED", donationId: created.id, version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new ApiError(409, "Hisse başka bir işlem tarafından dolduruldu.");
      const remaining = await tx.share.count({ where: { projectId: project.id, status: "EMPTY" } });
      if (remaining === 0) await tx.project.update({ where: { id: project.id }, data: { status: "FULL" } });
      const recipient = input.messageTarget === "CLOSE" ? input.donor.closePhone : normalizedPhone;
      let sms: { id: string; phone: string; message: string } | null = null;
      if ((input.sendSms || input.sendWhatsapp) && recipient) {
        const organizationName = typeof settingValue.organizationName === "string" ? settingValue.organizationName : "Yedirenk";
        const body = `Sayın ${input.donor.firstName} ${input.donor.lastName}, ${input.amount.toLocaleString("tr-TR")} tutarındaki kurban bağışınız alınmıştır. Makbuz: ${created.receipt?.number}. ${organizationName}`;
        if (input.sendSms) {
          const smsMessage = await tx.message.create({ data: { donationId: created.id, channel: "SMS", recipient, provider: process.env.SMS_PROVIDER === "twilio" ? "Twilio" : "Yedirenk Demo SMS", templateId: input.messageTemplateId, renderedBody: body, status: "PENDING" } });
          sms = { id: smsMessage.id, phone: recipient, message: body };
        }
        if (input.sendWhatsapp) await tx.message.create({ data: { donationId: created.id, channel: "WHATSAPP", recipient, templateId: input.messageTemplateId, renderedBody: body, status: process.env.WHATSAPP_ACCESS_TOKEN ? "PENDING" : "FAILED", errorMessage: process.env.WHATSAPP_ACCESS_TOKEN ? null : "WhatsApp sağlayıcısı yapılandırılmadı." } });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: "SACRIFICE_DONATION_CREATED", entityType: "Donation", entityId: created.id, newValue: { projectId: project.id, shareNumber: share.shareNumber, amount: input.amount, receipt: created.receipt?.number }, ipAddress: await requestIp() } });
      return { donation: created, sms };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.sms) {
      const provider = getSmsProvider();
      const sent = await provider.sendSms({ phone: result.sms.phone, message: result.sms.message });
      await prisma.message.update({ where: { id: result.sms.id }, data: { status: sent.success ? "SENT" : "FAILED", providerKey: sent.providerId, errorMessage: sent.errorMessage, sentAt: sent.success ? new Date() : null } });
      await prisma.auditLog.create({ data: { userId: user.id, action: sent.success ? "SMS_SENT" : "SMS_FAILED", entityType: "Message", entityId: result.sms.id, newValue: { provider: provider.name, recipient: result.sms.phone } } });
    }
    const donation = result.donation;
    return Response.json({ donation: { ...donation, amount: donation.amount.toString(), foreignAmount: donation.foreignAmount?.toString() ?? null } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
