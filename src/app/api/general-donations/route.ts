import { Prisma } from "@/generated/prisma/client";
import { apiError } from "@/lib/server/api";
import { requirePermission } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  try {
    await requirePermission("donation:view");
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") ?? 0);
    const month = Number(url.searchParams.get("month") ?? 0);
    const startDate = year
      ? new Date(Date.UTC(year, month ? month - 1 : 0, 1))
      : undefined;
    const endDate = year
      ? new Date(Date.UTC(year, month || 12, 1))
      : undefined;
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("q")?.trim() ?? "";
    const prisma = getPrisma();
    const matchingDefinitions = search
      ? await prisma.definition.findMany({
          where: { name: { contains: search, mode: "insensitive" } },
          select: { id: true },
        })
      : [];
    const matchingDefinitionIds = matchingDefinitions.map((item) => item.id);
    const where: Prisma.DonationWhereInput = {
      projectId: null,
      status: { not: "CANCELLED" },
      ...(url.searchParams.get("typeId") ? { typeId: url.searchParams.get("typeId")! } : {}),
      ...(url.searchParams.get("groupId") ? { groupId: url.searchParams.get("groupId")! } : {}),
      ...(url.searchParams.get("city") ? { donor: { originCity: url.searchParams.get("city")! } } : {}),
      ...(url.searchParams.get("paymentMethodId") ? { paymentMethodId: url.searchParams.get("paymentMethodId")! } : {}),
      ...(status === "ORDERED" ? { orderStatus: true } : status === "STANDARD" ? { orderStatus: false } : {}),
      ...(startDate && endDate ? { createdAt: { gte: startDate, lt: endDate } } : {}),
      ...(search ? {
        OR: [
          { donor: { firstName: { contains: search, mode: "insensitive" } } },
          { donor: { lastName: { contains: search, mode: "insensitive" } } },
          { donor: { normalizedPhone: { contains: search, mode: "insensitive" } } },
          { donor: { originCity: { contains: search, mode: "insensitive" } } },
          { donor: { originDistrict: { contains: search, mode: "insensitive" } } },
          { receipt: { number: { contains: search, mode: "insensitive" } } },
          ...(matchingDefinitionIds.length ? [
            { typeId: { in: matchingDefinitionIds } },
            { groupId: { in: matchingDefinitionIds } },
            { destinationCountryId: { in: matchingDefinitionIds } },
            { paymentMethodId: { in: matchingDefinitionIds } },
          ] : []),
        ],
      } : {}),
    };
    const donations = await prisma.donation.findMany({
      where,
      include: { donor: true, payment: true, receipt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
    });
    const definitionIds = [...new Set(donations.flatMap((item) => [
      item.typeId,
      item.groupId,
      item.destinationCountryId,
      item.paymentMethodId,
      item.currencyId,
    ].filter((value): value is string => Boolean(value))))];
    const definitions = await prisma.definition.findMany({
      where: { id: { in: definitionIds } },
      select: { id: true, name: true, code: true },
    });
    const names = new Map(definitions.map((item) => [item.id, item]));
    return Response.json({
      donations: donations.map((item) => ({
        id: item.id,
        date: item.createdAt.toISOString(),
        firstName: item.donor.firstName,
        lastName: item.donor.lastName,
        phone: item.donor.normalizedPhone,
        city: item.donor.originCity ?? "",
        district: item.donor.originDistrict ?? "",
        type: names.get(item.typeId)?.name ?? "",
        group: names.get(item.groupId ?? "")?.name ?? "",
        quantity: item.quantity,
        country: names.get(item.destinationCountryId ?? "")?.name ?? "",
        paymentMethod: names.get(item.paymentMethodId)?.name ?? "",
        amount: Number(item.amount),
        currencyCode: names.get(item.currencyId)?.code ?? "TRY",
        receiptNo: item.receipt?.number ?? "",
        orderStatus: item.orderStatus,
      })),
      total: donations.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
