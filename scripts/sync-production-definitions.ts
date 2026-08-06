import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Country } from "country-state-city";
import trCountryNames from "react-phone-number-input/locale/tr.json";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

if (!connectionString) throw new Error("Üretim veritabanı bağlantısı bulunamadı.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const coreDefinitions = [
  ["DEPARTMENT", "BUYUKBAS", "Büyükbaş Kurban", null],
  ["DEPARTMENT", "KUCUKBAS", "Küçükbaş Kurban", null],
  ["DONATION_TYPE", "KURBAN", "Kurban", null],
  ["DONATION_GROUP", "VACIP", "Vacip", null],
  ["DONATION_GROUP", "ADAK", "Adak", null],
  ["DONATION_GROUP", "AKIKA", "Akika", null],
  ["DONATION_GROUP", "NAFILE", "Nafile", null],
  ["CURRENCY", "USD", "Amerikan Doları", "$"],
  ["CURRENCY", "EUR", "Euro", "€"],
  ["CURRENCY", "TRY", "Türk Lirası", "₺"],
  ["CURRENCY", "GBP", "İngiliz Sterlini", "£"],
] as const;

const destinationDefinitions = [
  ["AF", "Afganistan", "KABIL_UMUT", "Kabil Umut Yardımlaşma", "KABIL_1", "Kabil-1"],
  ["AFRICA", "Afrika", "AFRIKA_DAYANISMA", "Afrika Dayanışma Ağı", "SAHRA_1", "Sahra-1"],
  ["BD", "Bangladeş", "DAKKA_RAHMET", "Dakka Rahmet Vakfı", "DAKKA_1", "Dakka-1"],
  ["TD", "Çad", "ENCEMINE_DAYANISMA", "Encemine Dayanışma Derneği", "ENCEMINE_1", "Encemine-1"],
  ["ET", "Etiyopya", "ADDIS_UMUT", "Addis Umut Vakfı", "ADDIS_ABABA_1", "Addis Ababa-1"],
  ["PS_GAZZE", "Filistin - Gazze", "GAZZE_RAHMET", "Gazze Rahmet Derneği", "GAZZE_1", "Gazze-1"],
  ["CM", "Kamerun", "YAOUNDE_DAYANISMA", "Yaoundé Dayanışma Vakfı", "YAOUNDE_1", "Yaoundé-1"],
  ["SO", "Somali", "MOGADISU_UMUT", "Mogadişu Umut Derneği", "MOGADISU_1", "Mogadişu-1"],
  ["SY", "Suriye", "SAM_IYILIK", "Şam İyilik Vakfı", "IDLIB_1", "İdlib-1"],
  ["TZ", "Tanzanya", "DARUSSELAM_DAYANISMA", "Darüsselam Dayanışma", "DARUSSELAM_1", "Darüsselam-1"],
  ["TR", "Türkiye", "ANADOLU_VEFA", "Anadolu Yedirenk Derneği", "ANADOLU_1", "Anadolu-1"],
  ["YE", "Yemen", "SANA_UMUT", "Sana Umut Vakfı", "SANA_1", "Sana-1"],
] as const;

const groupMappings: Record<string, Array<[string, string]>> = {
  FIDYE_FITRE_YEMIN_KEFARETI: [["FIDYE", "Fidye"], ["FITRE", "Fitre"], ["YEMIN_KEFARETI", "Yemin Kefareti"]],
  BURS: [["BURS_STANDART", "Burs"]],
  DOGAL_AFET: [["DOGAL_AFET_STANDART", "Doğal Afet"]],
  GENEL_BAGIS: [["GENEL_BAGIS_STANDART", "Genel Bağış"]],
  GIDA_KOLISI: [["GIDA_KOLISI_STANDART", "Gıda Kolisi"]],
  IFTAR: [["IFTAR_STANDART", "İftar"]],
  KARDES_AILE: [["KARDES_AILE_STANDART", "Kardeş Aile"]],
  KUMBARA: [["KUMBARA_STANDART", "Kumbara"]],
  KURAN: [["KURAN_STANDART", "Kur'an-ı Kerim"]],
  PROMOSYON: [["PROMOSYON_STANDART", "Promosyon"]],
  SOSYAL_HIZMET: [["SOSYAL_HIZMET_STANDART", "Sosyal Hizmet"]],
  TOPLU_YEMEK: [["TOPLU_YEMEK_STANDART", "Toplu Yemek"]],
  YETIM: [["YETIM_STANDART", "Yetim"]],
  ZEKAT: [["ZEKAT_STANDART", "Zekat"]],
};

async function upsertDefinition(type: string, code: string, name: string, symbol: string | null = null, parentId: string | null = null, sortOrder = 0) {
  return prisma.definition.upsert({
    where: { type_code: { type, code } },
    update: { name, symbol, parentId, sortOrder, isActive: true, deletedAt: null },
    create: { type, code, name, symbol, parentId, sortOrder, isActive: true },
  });
}

async function main() {
  for (const [type, code, name, symbol] of coreDefinitions) await upsertDefinition(type, code, name, symbol);

  for (const [index, [countryCode, countryName, partnerCode, partnerName, regionCode, regionName]] of destinationDefinitions.entries()) {
    const country = await upsertDefinition("DESTINATION_COUNTRY", countryCode, countryName, null, null, index + 1);
    await upsertDefinition("PARTNER", partnerCode, partnerName, null, country.id, index + 1);
    await upsertDefinition("DESTINATION_REGION", regionCode, regionName, null, country.id, index + 1);
  }

  for (const [typeCode, groups] of Object.entries(groupMappings)) {
    const type = await prisma.definition.findUnique({ where: { type_code: { type: "DONATION_TYPE", code: typeCode } } });
    if (!type) continue;
    for (const [index, [code, name]] of groups.entries()) await upsertDefinition("GENERAL_DONATION_GROUP", code, name, null, type.id, index + 1);
  }

  const originCountries = Country.getAllCountries()
    .map((country) => ({ code: country.isoCode, name: trCountryNames[country.isoCode as keyof typeof trCountryNames] ?? country.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "tr"));
  await prisma.definition.createMany({
    data: originCountries.map((country, index) => ({ type: "ORIGIN_COUNTRY", code: country.code, name: country.name, sortOrder: index + 1, isActive: true })),
    skipDuplicates: true,
  });
  for (let offset = 0; offset < originCountries.length; offset += 50) {
    const batch = originCountries.slice(offset, offset + 50);
    await prisma.$transaction(batch.map((country, index) => prisma.definition.update({
      where: { type_code: { type: "ORIGIN_COUNTRY", code: country.code } },
      data: { name: country.name, sortOrder: offset + index + 1, isActive: true, deletedAt: null },
    })));
  }

  console.log(`Üretim tanımları senkronize edildi: ${originCountries.length} gelen ülke, ${destinationDefinitions.length} faaliyet ülkesi.`);
}

main().finally(() => prisma.$disconnect());
