import type { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/server/auth";

type DefinitionField = {
  id: string | null | undefined;
  type: string | string[];
  label: string;
  optional?: boolean;
};

export async function requireDefinitions(tx: Prisma.TransactionClient, fields: DefinitionField[]) {
  const selected = fields.filter((field) => Boolean(field.id));
  const missingRequired = fields.find((field) => !field.optional && !field.id);
  if (missingRequired) throw new ApiError(422, `${missingRequired.label} seçilmelidir.`);

  const definitions = await tx.definition.findMany({
    where: { id: { in: selected.map((field) => field.id!) }, isActive: true, deletedAt: null },
  });
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  for (const field of selected) {
    const definition = byId.get(field.id!);
    const expected = Array.isArray(field.type) ? field.type : [field.type];
    if (!definition || !expected.includes(definition.type)) {
      throw new ApiError(422, `${field.label} pasif, geçersiz veya yanlış tanım türündedir.`);
    }
  }
  return byId;
}

export function requireParent(
  child: { parentId: string | null } | undefined,
  allowedParentIds: Array<string | null | undefined>,
  label: string,
) {
  if (!child) return;
  const allowed = allowedParentIds.filter((id): id is string => Boolean(id));
  if (child.parentId && !allowed.includes(child.parentId)) {
    throw new ApiError(422, `${label}, seçilen üst kayıtla bağlantılı değildir.`);
  }
}

export async function validateProjectDefinitions(tx: Prisma.TransactionClient, input: {
  yearId: string;
  departmentId: string;
  typeId: string;
  groupId: string;
  destinationCountryId: string;
  partnerId?: string | null;
  destinationRegionId?: string | null;
  currencyId: string;
}) {
  const definitions = await requireDefinitions(tx, [
    { id: input.yearId, type: "YEAR", label: "Yıl" },
    { id: input.departmentId, type: "DEPARTMENT", label: "Bölüm" },
    { id: input.typeId, type: "DONATION_TYPE", label: "Bağış türü" },
    { id: input.groupId, type: "DONATION_GROUP", label: "Bağış grubu" },
    { id: input.destinationCountryId, type: "DESTINATION_COUNTRY", label: "Giden ülke" },
    { id: input.partnerId, type: "PARTNER", label: "Partner", optional: true },
    { id: input.destinationRegionId, type: "DESTINATION_REGION", label: "Giden bölge", optional: true },
    { id: input.currencyId, type: "CURRENCY", label: "Para birimi" },
  ]);
  requireParent(definitions.get(input.partnerId ?? ""), [input.destinationCountryId], "Partner");
  requireParent(definitions.get(input.destinationRegionId ?? ""), [input.destinationCountryId, input.partnerId], "Giden bölge");
  return definitions;
}

export async function validateGeneralDonationDefinitions(tx: Prisma.TransactionClient, input: {
  typeId: string;
  groupId?: string | null;
  destinationCountryId?: string | null;
  destinationRegionId?: string | null;
  partnerId?: string | null;
}) {
  const definitions = await requireDefinitions(tx, [
    { id: input.groupId, type: "GENERAL_DONATION_GROUP", label: "Bağış grubu", optional: true },
    { id: input.destinationCountryId, type: "DESTINATION_COUNTRY", label: "Giden ülke", optional: true },
    { id: input.partnerId, type: "PARTNER", label: "Partner", optional: true },
    { id: input.destinationRegionId, type: "DESTINATION_REGION", label: "Giden bölge", optional: true },
  ]);
  if ((input.partnerId || input.destinationRegionId) && !input.destinationCountryId) {
    throw new ApiError(422, "Partner veya bölge seçildiğinde giden ülke de seçilmelidir.");
  }
  requireParent(definitions.get(input.groupId ?? ""), [input.typeId], "Bağış grubu");
  const partner = definitions.get(input.partnerId ?? "");
  if (partner && partner.parentId !== input.destinationCountryId) {
    throw new ApiError(422, "Partner, seçilen giden ülkeye bağlı değildir.");
  }
  const region = definitions.get(input.destinationRegionId ?? "");
  if (region && ![input.destinationCountryId, input.partnerId].includes(region.parentId)) {
    throw new ApiError(422, "Giden bölge, seçilen ülke veya partnere bağlı değildir.");
  }
}
