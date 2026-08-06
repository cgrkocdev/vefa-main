import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { City, Country, State } from "country-state-city";
import trCountryNames from "react-phone-number-input/locale/tr.json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL tanımlı değil.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const definitions = [
  ["YEAR", "2026", "2026", null],
  ["DEPARTMENT", "BUYUKBAS", "Büyükbaş Kurban", null],
  ["DEPARTMENT", "KUCUKBAS", "Küçükbaş Kurban", null],
  ["DONATION_TYPE", "KURBAN", "Kurban", null],
  ["DONATION_TYPE", "AYNI", "Ayni", null],
  ["DONATION_TYPE", "BURS", "Burs", null],
  ["DONATION_TYPE", "DOGAL_AFET", "Doğal Afet", null],
  ["DONATION_TYPE", "FIDYE_FITRE_YEMIN_KEFARETI", "Fidye - Fitre - Yemin Kefareti", null],
  ["DONATION_TYPE", "GENEL_BAGIS", "Genel Bağış", null],
  ["DONATION_TYPE", "GIDA_KOLISI", "Gıda Kolisi", null],
  ["DONATION_TYPE", "IFTAR", "İftar", null],
  ["DONATION_TYPE", "KARDES_AILE", "Kardeş Aile", null],
  ["DONATION_TYPE", "KUMBARA", "Kumbara", null],
  ["DONATION_TYPE", "KURAN", "Kur'an-ı Kerim", null],
  ["DONATION_TYPE", "PROMOSYON", "Promosyon", null],
  ["DONATION_TYPE", "SOSYAL_HIZMET", "Sosyal Hizmet", null],
  ["DONATION_TYPE", "TOPLU_YEMEK", "Toplu Yemek", null],
  ["DONATION_TYPE", "YETIM", "Yetim", null],
  ["DONATION_TYPE", "ZEKAT", "Zekat", null],
  ["DONATION_GROUP", "VACIP", "Vacip", null],
  ["DONATION_GROUP", "NAFILE", "Nafile", null],
  ["DONATION_GROUP", "ADAK", "Adak", null],
  ["DONATION_GROUP", "AKIKA", "Akika", null],
  ["DONATION_GROUP", "SUKUR", "Şükür", null],
  ["ORIGIN_COUNTRY", "TR", "Türkiye", null],
  ["DESTINATION_COUNTRY", "AF", "Afganistan", null],
  ["DESTINATION_COUNTRY", "AFRICA", "Afrika", null],
  ["DESTINATION_COUNTRY", "BD", "Bangladeş", null],
  ["DESTINATION_COUNTRY", "TD", "Çad", null],
  ["DESTINATION_COUNTRY", "ET", "Etiyopya", null],
  ["DESTINATION_COUNTRY", "PS_GAZZE", "Filistin - Gazze", null],
  ["DESTINATION_COUNTRY", "CM", "Kamerun", null],
  ["DESTINATION_COUNTRY", "SO", "Somali", null],
  ["DESTINATION_COUNTRY", "SY", "Suriye", null],
  ["DESTINATION_COUNTRY", "TZ", "Tanzanya", null],
  ["DESTINATION_COUNTRY", "TR", "Türkiye", null],
  ["DESTINATION_COUNTRY", "YE", "Yemen", null],
  ["PARTNER", "VEFA", "Yedirenk Derneği", null],
  ["PAYMENT_METHOD", "SAME_PAYMENT", "Ayni Ödeme", null],
  ["PAYMENT_METHOD", "BANK", "Banka", null],
  ["PAYMENT_METHOD", "CHECK", "Çek", null],
  ["PAYMENT_METHOD", "PARTIAL_PAYMENT", "Kısmi Ödeme", null],
  ["PAYMENT_METHOD", "CASH", "Nakit", null],
  ["PAYMENT_METHOD", "ONLINE_DONATION", "Online Bağış", null],
  ["PAYMENT_METHOD", "PAYMENT_PENDING", "Ödeme Bekliyor", null],
  ["PAYMENT_METHOD", "POS_DEVICE", "Pos Cihazı", null],
  ["UNIT_TYPE", "ADET", "Adet", null],
  ["UNIT_TYPE", "KOLI", "Koli", null],
  ["UNIT_TYPE", "PAKET", "Paket", null],
  ["UNIT_TYPE", "KISI", "Kişi", null],
  ["GENERAL_DONATION_GROUP", "BATTANIYE", "Battaniye", null],
  ["GENERAL_DONATION_GROUP", "BEBEK_MAMASI", "Bebek Maması", null],
  ["GENERAL_DONATION_GROUP", "BEYAZ_ESYA", "Beyaz Eşya", null],
  ["GENERAL_DONATION_GROUP", "COCUK_VE_HASTA_BEZI", "Çocuk ve Hasta Bezi", null],
  ["GENERAL_DONATION_GROUP", "ELMA", "Elma", null],
  ["GENERAL_DONATION_GROUP", "GIDA_KOLISI", "Gıda Kolisi", null],
  ["GENERAL_DONATION_GROUP", "GIYIM", "Giyim", null],
  ["GENERAL_DONATION_GROUP", "HIJYEN_PAKETI", "Hijyen Paketi", null],
  ["GENERAL_DONATION_GROUP", "HURMA", "Hurma", null],
  ["GENERAL_DONATION_GROUP", "KOMUR_YAKACAK", "Kömür / Yakacak", null],
  ["GENERAL_DONATION_GROUP", "MERMER", "Mermer", null],
  ["GENERAL_DONATION_GROUP", "ODUN", "Odun", null],
  ["GENERAL_DONATION_GROUP", "PATATES", "Patates", null],
  ["GENERAL_DONATION_GROUP", "SOBA", "Soba", null],
  ["GENERAL_DONATION_GROUP", "TEMIZLIK_URUNLERI", "Temizlik Ürünleri", null],
  ["GENERAL_DONATION_GROUP", "UN", "Un", null],
  ["CURRENCY", "TRY", "Türk Lirası", "₺"],
  ["CURRENCY", "USD", "Amerikan Doları", "$"],
  ["CURRENCY", "EUR", "Euro", "€"],
  ["CURRENCY", "GBP", "İngiliz Sterlini", "£"],
  ["PROJECT_STATUS", "OPEN", "Açık", null],
  ["SHARE_STATUS", "EMPTY", "Boş", null],
] as const;

const destinationCountryOrder = [
  "AF", "AFRICA", "BD", "TD", "ET", "PS_GAZZE",
  "CM", "SO", "SY", "TZ", "TR", "YE",
] as const;

const paymentMethodOrder = [
  "SAME_PAYMENT", "BANK", "CHECK", "PARTIAL_PAYMENT",
  "CASH", "ONLINE_DONATION", "PAYMENT_PENDING", "POS_DEVICE",
] as const;

const inKindGroupCodes = [
  "BATTANIYE", "BEBEK_MAMASI", "BEYAZ_ESYA", "COCUK_VE_HASTA_BEZI",
  "ELMA", "GIDA_KOLISI", "GIYIM", "HIJYEN_PAKETI", "HURMA",
  "KOMUR_YAKACAK", "MERMER", "ODUN", "PATATES", "SOBA",
  "TEMIZLIK_URUNLERI", "UN",
] as const;

const generalDonationGroupMappings: Record<string, Array<{ code: string; name: string }>> = {
  AYNI: inKindGroupCodes.map((code) => ({
    code,
    name: definitions.find(([type, definitionCode]) => type === "GENERAL_DONATION_GROUP" && definitionCode === code)?.[2] ?? code,
  })),
  BURS: [{ code: "BURS_STANDART", name: "Burs" }],
  DOGAL_AFET: [{ code: "DOGAL_AFET_STANDART", name: "Doğal Afet" }],
  FIDYE_FITRE_YEMIN_KEFARETI: [
    { code: "FIDYE", name: "Fidye" },
    { code: "FITRE", name: "Fitre" },
    { code: "YEMIN_KEFARETI", name: "Yemin Kefareti" },
  ],
  GENEL_BAGIS: [{ code: "GENEL_BAGIS_STANDART", name: "Genel Bağış" }],
  GIDA_KOLISI: [{ code: "GIDA_KOLISI_STANDART", name: "Gıda Kolisi" }],
  IFTAR: [{ code: "IFTAR_STANDART", name: "İftar" }],
  KARDES_AILE: [{ code: "KARDES_AILE_STANDART", name: "Kardeş Aile" }],
  KUMBARA: [{ code: "KUMBARA_STANDART", name: "Kumbara" }],
  KURAN: [{ code: "KURAN_STANDART", name: "Kur'an-ı Kerim" }],
  PROMOSYON: [{ code: "PROMOSYON_STANDART", name: "Promosyon" }],
  SOSYAL_HIZMET: [{ code: "SOSYAL_HIZMET_STANDART", name: "Sosyal Hizmet" }],
  TOPLU_YEMEK: [{ code: "TOPLU_YEMEK_STANDART", name: "Toplu Yemek" }],
  YETIM: [{ code: "YETIM_STANDART", name: "Yetim" }],
  ZEKAT: [{ code: "ZEKAT_STANDART", name: "Zekat" }],
};

const defaultGeneralGroupCode = (typeCode: string, fallback = "") =>
  typeCode === "AYNI" && fallback
    ? fallback
    : generalDonationGroupMappings[typeCode]?.[0]?.code ?? fallback;

const demoPartners = [
  ["AF", "KABIL_UMUT", "Kabil Umut Yardımlaşma"],
  ["AFRICA", "AFRIKA_DAYANISMA", "Afrika Dayanışma Ağı"],
  ["BD", "DAKKA_RAHMET", "Dakka Rahmet Vakfı"],
  ["TD", "ENCEMINE_DAYANISMA", "Encemine Dayanışma Derneği"],
  ["ET", "ADDIS_UMUT", "Addis Umut Vakfı"],
  ["PS_GAZZE", "GAZZE_RAHMET", "Gazze Rahmet Derneği"],
  ["CM", "YAOUNDE_DAYANISMA", "Yaoundé Dayanışma Vakfı"],
  ["SO", "MOGADISU_UMUT", "Mogadişu Umut Derneği"],
  ["SY", "SAM_IYILIK", "Şam İyilik Vakfı"],
  ["TZ", "DARUSSELAM_DAYANISMA", "Darüsselam Dayanışma"],
  ["TR", "ANADOLU_VEFA", "Anadolu Yedirenk Derneği"],
  ["YE", "SANA_UMUT", "Sana Umut Vakfı"],
] as const;

const demoRegions = [
  ["AF", "KABIL_1", "Kabil-1"],
  ["AFRICA", "SAHRA_1", "Sahra-1"],
  ["BD", "DAKKA_1", "Dakka-1"],
  ["TD", "ENCEMINE_1", "Encemine-1"],
  ["ET", "ADDIS_ABABA_1", "Addis Ababa-1"],
  ["PS_GAZZE", "GAZZE_1", "Gazze-1"],
  ["CM", "YAOUNDE_1", "Yaoundé-1"],
  ["SO", "MOGADISU_1", "Mogadişu-1"],
  ["SY", "IDLIB_1", "İdlib-1"],
  ["TZ", "DARUSSELAM_1", "Darüsselam-1"],
  ["TR", "ANADOLU_1", "Anadolu-1"],
  ["YE", "SANA_1", "Sana-1"],
] as const;

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "yasir@gmail" },
    update: {},
    create: {
      name: "Yasir",
      email: "yasir@gmail",
      passwordHash: await hash("12345678", 12),
      role: "ADMIN",
    },
  });

  for (const [type, code, name, symbol] of definitions) {
    const destinationIndex = type === "DESTINATION_COUNTRY"
      ? destinationCountryOrder.indexOf(code as (typeof destinationCountryOrder)[number])
      : -1;
    const paymentIndex = type === "PAYMENT_METHOD"
      ? paymentMethodOrder.indexOf(code as (typeof paymentMethodOrder)[number])
      : -1;
    const sortOrder = destinationIndex >= 0
      ? destinationIndex + 1
      : paymentIndex >= 0
        ? paymentIndex + 1
        : 0;
    await prisma.definition.upsert({
      where: { type_code: { type, code } },
      update: { name, symbol, sortOrder, isActive: true },
      create: { type, code, name, symbol, sortOrder },
    });
  }

  const generalDonationTypes = await prisma.definition.findMany({
    where: { type: "DONATION_TYPE", code: { in: Object.keys(generalDonationGroupMappings) } },
    select: { id: true, code: true },
  });
  const generalDonationTypeIds = new Map(generalDonationTypes.map((type) => [type.code, type.id]));
  for (const [typeCode, groups] of Object.entries(generalDonationGroupMappings)) {
    const parentId = generalDonationTypeIds.get(typeCode);
    if (!parentId) throw new Error(`${typeCode} bağış türü bulunamadı.`);
    for (const [index, group] of groups.entries()) {
      await prisma.definition.upsert({
        where: { type_code: { type: "GENERAL_DONATION_GROUP", code: group.code } },
        update: { name: group.name, parentId, sortOrder: index + 1, isActive: true, deletedAt: null },
        create: {
          type: "GENERAL_DONATION_GROUP",
          code: group.code,
          name: group.name,
          parentId,
          sortOrder: index + 1,
          isActive: true,
        },
      });
    }
  }

  const originCountries = Country.getAllCountries()
    .map((country) => ({
      code: country.isoCode,
      name: trCountryNames[country.isoCode as keyof typeof trCountryNames] ?? country.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "tr"));
  for (const [index, country] of originCountries.entries()) {
    await prisma.definition.upsert({
      where: { type_code: { type: "ORIGIN_COUNTRY", code: country.code } },
      update: { name: country.name, sortOrder: index + 1, isActive: true, deletedAt: null },
      create: {
        type: "ORIGIN_COUNTRY",
        code: country.code,
        name: country.name,
        sortOrder: index + 1,
        isActive: true,
      },
    });
  }

  await prisma.definition.updateMany({
    where: {
      type: "PAYMENT_METHOD",
      code: { notIn: [...paymentMethodOrder] },
    },
    data: { isActive: false },
  });

  for (const [countryCode, code, name] of demoPartners) {
    const country = await prisma.definition.findUniqueOrThrow({
      where: { type_code: { type: "DESTINATION_COUNTRY", code: countryCode } },
    });
    await prisma.definition.upsert({
      where: { type_code: { type: "PARTNER", code } },
      update: { name, parentId: country.id, isActive: true },
      create: { type: "PARTNER", code, name, parentId: country.id, isActive: true },
    });
  }

  const originTurkey = await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "ORIGIN_COUNTRY", code: "TR" } } });
  for (const province of State.getStatesOfCountry("TR")) {
    const originCity = await prisma.definition.upsert({
      where: { type_code: { type: "ORIGIN_CITY", code: `TR-${province.isoCode}` } },
      update: { name: province.name, parentId: originTurkey.id, isActive: true },
      create: { type: "ORIGIN_CITY", code: `TR-${province.isoCode}`, name: province.name, parentId: originTurkey.id, isActive: true },
    });
    for (const district of City.getCitiesOfState("TR", province.isoCode)) {
      const districtCode = `TR-${province.isoCode}-${district.name.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]+/g, "_")}`.slice(0, 80);
      await prisma.definition.upsert({
        where: { type_code: { type: "ORIGIN_DISTRICT", code: districtCode } },
        update: { name: district.name, parentId: originCity.id, isActive: true },
        create: { type: "ORIGIN_DISTRICT", code: districtCode, name: district.name, parentId: originCity.id, isActive: true },
      });
    }
  }

  const required = await prisma.definition.findMany({
    where: {
      OR: [
        { type: "YEAR", code: "2026" },
        { type: "DEPARTMENT", code: "BUYUKBAS" },
        { type: "DONATION_TYPE", code: "KURBAN" },
        { type: "DONATION_GROUP", code: { in: ["VACIP", "ADAK", "AKIKA"] } },
        { type: "CURRENCY", code: "TRY" },
        { type: "PARTNER", code: "VEFA" },
        { type: "DESTINATION_COUNTRY", code: { in: ["TR", "SO", "AFRICA"] } },
      ],
    },
  });
  const definitionId = (type: string, code: string) => {
    const item = required.find((definition) => definition.type === type && definition.code === code);
    if (!item) throw new Error(`${type}/${code} tanımı bulunamadı.`);
    return item.id;
  };
  const projectTemplates = [
    { countryCode: "SO", groupCode: "VACIP", number: 1, name: "2026 Somali Vacip Kurban", price: "14500" },
    { countryCode: "AFRICA", groupCode: "VACIP", number: 1, name: "2026 Afrika Vacip Kurban", price: "12500" },
    { countryCode: "TR", groupCode: "VACIP", number: 1, name: "2026 Türkiye Vacip Kurban", price: "18500" },
    { countryCode: "SO", groupCode: "ADAK", number: 2, name: "2026 Somali Adak Kurban", price: "13500" },
    { countryCode: "AFRICA", groupCode: "ADAK", number: 2, name: "2026 Afrika Adak Kurban", price: "11500" },
    { countryCode: "TR", groupCode: "ADAK", number: 2, name: "2026 Türkiye Adak Kurban", price: "17500" },
    { countryCode: "SO", groupCode: "AKIKA", number: 3, name: "2026 Somali Akika Kurban", price: "13500" },
    { countryCode: "AFRICA", groupCode: "AKIKA", number: 3, name: "2026 Afrika Akika Kurban", price: "11500" },
    { countryCode: "TR", groupCode: "AKIKA", number: 3, name: "2026 Türkiye Akika Kurban", price: "17500" },
  ];
  for (const template of projectTemplates) {
    const destinationCountryId = definitionId("DESTINATION_COUNTRY", template.countryCode);
    const regionTemplate = demoRegions.find(([countryCode]) => countryCode === template.countryCode);
    if (!regionTemplate) throw new Error(`${template.countryCode} için bölge şablonu bulunamadı.`);
    const destinationRegion = await prisma.definition.upsert({
      where: { type_code: { type: "DESTINATION_REGION", code: regionTemplate[1] } },
      update: { name: regionTemplate[2], parentId: destinationCountryId, isActive: true },
      create: { type: "DESTINATION_REGION", code: regionTemplate[1], name: regionTemplate[2], parentId: destinationCountryId, isActive: true },
    });
    await prisma.project.upsert({
      where: {
        yearId_departmentId_destinationCountryId_destinationRegionId_projectNumber: {
          yearId: definitionId("YEAR", "2026"),
          departmentId: definitionId("DEPARTMENT", "BUYUKBAS"),
          destinationCountryId,
          destinationRegionId: destinationRegion.id,
          projectNumber: template.number,
        },
      },
      update: {
        name: template.name,
        groupId: definitionId("DONATION_GROUP", template.groupCode),
        destinationCountryId,
        destinationRegionId: destinationRegion.id,
        sharePrice: template.price,
        status: "OPEN",
        deletedAt: null,
      },
      create: {
        yearId: definitionId("YEAR", "2026"),
        departmentId: definitionId("DEPARTMENT", "BUYUKBAS"),
        typeId: definitionId("DONATION_TYPE", "KURBAN"),
        groupId: definitionId("DONATION_GROUP", template.groupCode),
        destinationCountryId,
        destinationRegionId: destinationRegion.id,
        partnerId: definitionId("PARTNER", "VEFA"),
        projectNumber: template.number,
        name: template.name,
        animalType: "CATTLE",
        shareCapacity: 7,
        sharePrice: template.price,
        currencyId: definitionId("CURRENCY", "TRY"),
        status: "OPEN",
        createdById: admin.id,
        shares: { create: Array.from({ length: 7 }, (_, index) => ({ shareNumber: index + 1 })) },
      },
    });
  }

  for (const [index, [countryCode, regionCode, regionName]] of demoRegions.entries()) {
    const country = await prisma.definition.findUniqueOrThrow({
      where: { type_code: { type: "DESTINATION_COUNTRY", code: countryCode } },
    });
    const [, partnerCode] = demoPartners[index];
    const partner = await prisma.definition.findUniqueOrThrow({
      where: { type_code: { type: "PARTNER", code: partnerCode } },
    });
    const region = await prisma.definition.upsert({
      where: { type_code: { type: "DESTINATION_REGION", code: regionCode } },
      update: { name: regionName, parentId: country.id, sortOrder: 1, isActive: true },
      create: {
        type: "DESTINATION_REGION",
        code: regionCode,
        name: regionName,
        parentId: country.id,
        sortOrder: 1,
        isActive: true,
      },
    });
    const projectNumber = ["SO", "AFRICA", "TR"].includes(countryCode) ? 4 : 1;
    await prisma.project.upsert({
      where: {
        yearId_departmentId_destinationCountryId_destinationRegionId_projectNumber: {
          yearId: definitionId("YEAR", "2026"),
          departmentId: definitionId("DEPARTMENT", "BUYUKBAS"),
          destinationCountryId: country.id,
          destinationRegionId: region.id,
          projectNumber,
        },
      },
      update: {
        name: `2026 ${country.name} Vacip Kurban Test Projesi`,
        groupId: definitionId("DONATION_GROUP", "VACIP"),
        destinationCountryId: country.id,
        destinationRegionId: region.id,
        partnerId: partner.id,
        status: "OPEN",
        deletedAt: null,
      },
      create: {
        yearId: definitionId("YEAR", "2026"),
        departmentId: definitionId("DEPARTMENT", "BUYUKBAS"),
        typeId: definitionId("DONATION_TYPE", "KURBAN"),
        groupId: definitionId("DONATION_GROUP", "VACIP"),
        destinationCountryId: country.id,
        destinationRegionId: region.id,
        partnerId: partner.id,
        projectNumber,
        name: `2026 ${country.name} Vacip Kurban Test Projesi`,
        animalType: "CATTLE",
        shareCapacity: 7,
        sharePrice: "12500",
        currencyId: definitionId("CURRENCY", "TRY"),
        status: "OPEN",
        createdById: admin.id,
        description: "Ülke, partner, proje seçimi ve otomatik hisse atama testi için oluşturuldu.",
        shares: { create: Array.from({ length: 7 }, (_, shareIndex) => ({ shareNumber: shareIndex + 1 })) },
      },
    });
  }

  // İlk dokuz proje de ülkeye ait gerçek partner ve bölge tanımlarına bağlı
  // kalsın; genel Yedirenk partneri yalnızca geriye dönük uyumluluk içindir.
  for (const template of projectTemplates) {
    const partnerTemplate = demoPartners.find(([countryCode]) => countryCode === template.countryCode);
    const regionTemplate = demoRegions.find(([countryCode]) => countryCode === template.countryCode);
    if (!partnerTemplate || !regionTemplate) continue;
    const [partner, region] = await Promise.all([
      prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "PARTNER", code: partnerTemplate[1] } } }),
      prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "DESTINATION_REGION", code: regionTemplate[1] } } }),
    ]);
    await prisma.project.update({
      where: {
        yearId_departmentId_destinationCountryId_destinationRegionId_projectNumber: {
          yearId: definitionId("YEAR", "2026"),
          departmentId: definitionId("DEPARTMENT", "BUYUKBAS"),
          destinationCountryId: definitionId("DESTINATION_COUNTRY", template.countryCode),
          destinationRegionId: region.id,
          projectNumber: template.number,
        },
      },
      data: { partnerId: partner.id, destinationRegionId: region.id },
    });
  }

  const generalDonationSeeds = [
    { firstName: "Amina", lastName: "Diallo", phone: "+221770000101", phoneCountry: "SN", originCountry: "Senegal", originCity: "Dakar", type: "GIDA_KOLISI", group: "GIDA_KOLISI", destination: "AFRICA", payment: "BANK", quantity: 2, unitPrice: 1750 },
    { firstName: "Farid", lastName: "Ahmadi", phone: "+93700000102", phoneCountry: "AF", originCountry: "Afganistan", originCity: "Kabil", type: "BURS", group: "COCUK_VE_HASTA_BEZI", destination: "AF", payment: "CASH", quantity: 1, unitPrice: 3200 },
    { firstName: "Nusrat", lastName: "Jahan", phone: "+8801700000103", phoneCountry: "BD", originCountry: "Bangladeş", originCity: "Dakka", type: "YETIM", group: "BEBEK_MAMASI", destination: "BD", payment: "ONLINE_DONATION", quantity: 3, unitPrice: 900 },
    { firstName: "Idriss", lastName: "Mahamat", phone: "+23566000104", phoneCountry: "TD", originCountry: "Çad", originCity: "Encemine", type: "DOGAL_AFET", group: "BATTANIYE", destination: "TD", payment: "POS_DEVICE", quantity: 5, unitPrice: 650 },
    { firstName: "Hana", lastName: "Bekele", phone: "+251910000105", phoneCountry: "ET", originCountry: "Etiyopya", originCity: "Addis Ababa", type: "SOSYAL_HIZMET", group: "HIJYEN_PAKETI", destination: "ET", payment: "BANK", quantity: 4, unitPrice: 475 },
    { firstName: "Mariam", lastName: "Khalil", phone: "+970590000106", phoneCountry: "PS", originCountry: "Filistin", originCity: "Gazze", type: "IFTAR", group: "HURMA", destination: "PS_GAZZE", payment: "CASH", quantity: 10, unitPrice: 250 },
    { firstName: "Samuel", lastName: "Njoya", phone: "+237650000107", phoneCountry: "CM", originCountry: "Kamerun", originCity: "Yaounde", type: "KARDES_AILE", group: "GIYIM", destination: "CM", payment: "ONLINE_DONATION", quantity: 2, unitPrice: 2100 },
    { firstName: "Hodan", lastName: "Ali", phone: "+252610000108", phoneCountry: "SO", originCountry: "Somali", originCity: "Mogadişu", type: "GENEL_BAGIS", group: "UN", destination: "SO", payment: "PARTIAL_PAYMENT", quantity: 6, unitPrice: 400 },
    { firstName: "Omar", lastName: "Haddad", phone: "+963940000109", phoneCountry: "SY", originCountry: "Suriye", originCity: "Şam", type: "FIDYE_FITRE_YEMIN_KEFARETI", group: "KOMUR_YAKACAK", destination: "SY", payment: "PAYMENT_PENDING", quantity: 1, unitPrice: 2800 },
    { firstName: "Asha", lastName: "Mtemi", phone: "+255710000110", phoneCountry: "TZ", originCountry: "Tanzanya", originCity: "Darüsselam", type: "TOPLU_YEMEK", group: "PATATES", destination: "TZ", payment: "POS_DEVICE", quantity: 8, unitPrice: 325 },
  ] as const;
  const mappedGeneralGroupCodes = Object.values(generalDonationGroupMappings).flatMap((groups) => groups.map((group) => group.code));
  const generalDefinitionCodes = [...new Set([
    ...generalDonationSeeds.flatMap((item) => [item.type, defaultGeneralGroupCode(item.type, item.group), item.destination, item.payment]),
    ...mappedGeneralGroupCodes,
  ])];
  const generalDefinitions = await prisma.definition.findMany({
    where: { code: { in: generalDefinitionCodes }, isActive: true },
  });
  const generalDefinitionId = (type: string, code: string) => {
    const item = generalDefinitions.find((definition) => definition.type === type && definition.code === code);
    if (!item) throw new Error(`${type}/${code} tanımı bulunamadı.`);
    return item.id;
  };
  const tryCurrency = await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "CURRENCY", code: "TRY" } } });
  const generalDistrictByCity: Record<string, string> = {
    Dakar: "Plateau", Kabil: "Karte Seh", Dakka: "Gulshan", Encemine: "Chagoua", "Addis Ababa": "Bole",
    Gazze: "Er-Rimal", Yaounde: "Bastos", "Mogadişu": "Hodan", "Şam": "Mezze", "Darüsselam": "Ilala",
  };
  for (const [index, item] of generalDonationSeeds.entries()) {
    const originDistrict = generalDistrictByCity[item.originCity];
    const originCountryDefinition = await prisma.definition.upsert({
      where: { type_code: { type: "ORIGIN_COUNTRY", code: item.phoneCountry } },
      update: { name: item.originCountry, isActive: true },
      create: { type: "ORIGIN_COUNTRY", code: item.phoneCountry, name: item.originCountry, isActive: true },
    });
    const originCityCode = `${item.phoneCountry}-${item.originCity.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]+/g, "_")}`.slice(0, 80);
    const originCityDefinition = await prisma.definition.upsert({
      where: { type_code: { type: "ORIGIN_CITY", code: originCityCode } },
      update: { name: item.originCity, parentId: originCountryDefinition.id, isActive: true },
      create: { type: "ORIGIN_CITY", code: originCityCode, name: item.originCity, parentId: originCountryDefinition.id, isActive: true },
    });
    if (originDistrict) {
      const originDistrictCode = `${originCityCode}-${originDistrict.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]+/g, "_")}`.slice(0, 80);
      await prisma.definition.upsert({
        where: { type_code: { type: "ORIGIN_DISTRICT", code: originDistrictCode } },
        update: { name: originDistrict, parentId: originCityDefinition.id, isActive: true },
        create: { type: "ORIGIN_DISTRICT", code: originDistrictCode, name: originDistrict, parentId: originCityDefinition.id, isActive: true },
      });
    }
    const donor = await prisma.donor.upsert({
      where: { normalizedPhone: item.phone },
      update: { firstName: item.firstName, lastName: item.lastName, phoneCountry: item.phoneCountry, originCountry: item.originCountry, originCity: item.originCity, originDistrict },
      create: { firstName: item.firstName, lastName: item.lastName, normalizedPhone: item.phone, phoneCountry: item.phoneCountry, originCountry: item.originCountry, originCity: item.originCity, originDistrict },
    });
    const amount = item.quantity * item.unitPrice;
    const typeId = generalDefinitionId("DONATION_TYPE", item.type);
    const groupId = generalDefinitionId("GENERAL_DONATION_GROUP", defaultGeneralGroupCode(item.type, item.group));
    const destinationCountryId = generalDefinitionId("DESTINATION_COUNTRY", item.destination);
    const paymentMethodId = generalDefinitionId("PAYMENT_METHOD", item.payment);
    const receiptNumber = `GEN-2026-${String(index + 1).padStart(3, "0")}`;
    const orderStatus = [1, 5, 9].includes(index);
    await prisma.donation.upsert({
      where: { idempotencyKey: `general-donation-seed-${String(index + 1).padStart(3, "0")}` },
      update: { donorId: donor.id, typeId, groupId, destinationCountryId, paymentMethodId, quantity: item.quantity, unitType: "Adet", unitPrice: item.unitPrice, amount, orderStatus, status: "COMPLETED" },
      create: {
        donorId: donor.id,
        createdById: admin.id,
        typeId,
        groupId,
        destinationCountryId,
        quantity: item.quantity,
        unitType: "Adet",
        unitPrice: item.unitPrice,
        amount,
        orderStatus,
        currencyId: tryCurrency.id,
        paymentMethodId,
        description: `${item.originCountry} kaynaklı ${item.type.toLocaleLowerCase("tr-TR").replaceAll("_", " ")} bağışı`,
        idempotencyKey: `general-donation-seed-${String(index + 1).padStart(3, "0")}`,
        payment: { create: { amount, currencyId: tryCurrency.id, methodId: paymentMethodId, status: "PAID" } },
        receipt: { create: { number: receiptNumber, issuedAt: new Date(Date.UTC(2026, 6, 20 + index)) } },
      },
    });
  }

  const provinceStatisticSeeds = [
    ["Selin", "Yılmaz", "+905320001201", "İstanbul", "Kadıköy", "GENEL_BAGIS", "BANK", 1850],
    ["Mert", "Kaya", "+905320001202", "İstanbul", "Üsküdar", "GIDA_KOLISI", "CASH", 2400],
    ["Zeynep", "Demir", "+905320001203", "İstanbul", "Kadıköy", "BURS", "ONLINE_DONATION", 3200],
    ["Emre", "Şahin", "+905320001204", "Ankara", "Çankaya", "YETIM", "BANK", 2750],
    ["Elif", "Aydın", "+905320001205", "Ankara", "Keçiören", "SOSYAL_HIZMET", "POS_DEVICE", 1900],
    ["Burak", "Koç", "+905320001206", "Ankara", "Çankaya", "FIDYE_FITRE_YEMIN_KEFARETI", "CASH", 1600],
    ["Ayşe", "Arslan", "+905320001207", "Bursa", "Nilüfer", "DOGAL_AFET", "BANK", 4100],
    ["Can", "Öztürk", "+905320001208", "Bursa", "Osmangazi", "AYNI", "SAME_PAYMENT", 2250],
    ["Derya", "Çelik", "+905320001209", "Bursa", "Nilüfer", "KARDES_AILE", "ONLINE_DONATION", 3600],
    ["Kerem", "Aksoy", "+905320001210", "İzmir", "Konak", "IFTAR", "POS_DEVICE", 1450],
    ["Seda", "Kurt", "+905320001211", "İzmir", "Bornova", "TOPLU_YEMEK", "BANK", 5200],
    ["Onur", "Eren", "+905320001212", "İzmir", "Konak", "ZEKAT", "CASH", 6800],
  ] as const;
  const turkeyDestination = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "DESTINATION_COUNTRY", code: "TR" } } })).id;
  const generalType = generalDefinitionId("DONATION_TYPE", "GENEL_BAGIS");
  for (const [index, item] of provinceStatisticSeeds.entries()) {
    const [firstName, lastName, phone, city, district, typeCode, paymentCode, amount] = item;
    const donor = await prisma.donor.upsert({
      where: { normalizedPhone: phone },
      update: { firstName, lastName, phoneCountry: "TR", originCountry: "Türkiye", originCity: city, originDistrict: district },
      create: { firstName, lastName, normalizedPhone: phone, phoneCountry: "TR", originCountry: "Türkiye", originCity: city, originDistrict: district },
    });
    const typeId = (await prisma.definition.findUnique({ where: { type_code: { type: "DONATION_TYPE", code: typeCode } } }))?.id ?? generalType;
    const groupId = generalDefinitionId("GENERAL_DONATION_GROUP", defaultGeneralGroupCode(typeCode, "GIDA_KOLISI"));
    const paymentMethodId = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "PAYMENT_METHOD", code: paymentCode } } })).id;
    await prisma.donation.upsert({
      where: { idempotencyKey: `province-statistic-seed-${String(index + 1).padStart(3, "0")}` },
      update: { donorId: donor.id, typeId, groupId, destinationCountryId: turkeyDestination, paymentMethodId, quantity: 1, unitType: "Adet", unitPrice: amount, amount, status: "COMPLETED" },
      create: { donorId: donor.id, createdById: admin.id, typeId, groupId, destinationCountryId: turkeyDestination, quantity: 1, unitType: "Adet", unitPrice: amount, amount, currencyId: tryCurrency.id, paymentMethodId, description: `${city} / ${district} kaynaklı genel bağış`, idempotencyKey: `province-statistic-seed-${String(index + 1).padStart(3, "0")}`, payment: { create: { amount, currencyId: tryCurrency.id, methodId: paymentMethodId, status: "PAID" } }, receipt: { create: { number: `IL-2026-${String(index + 1).padStart(3, "0")}`, issuedAt: new Date(Date.UTC(2026, 6, 10 + index)) } } },
    });
  }

  const internationalProvinceHierarchy = [
    { code: "SN", country: "Senegal", destination: "AFRICA", cities: [["Dakar", ["Plateau", "Medina", "Ouakam"]], ["Thies", ["Grand Thies", "Medina Fall", "Thialy"]], ["Saint-Louis", ["Sor", "Nord", "Guet Ndar"]]] },
    { code: "AF", country: "Afganistan", destination: "AF", cities: [["Kabil", ["Karte Seh", "Vezir Ekber Han", "Hayr Hane"]], ["Herat", ["İncil", "Guzara", "Karuh"]], ["Kandahar", ["Dand", "Arğandab", "Spin Boldak"]]] },
    { code: "BD", country: "Bangladeş", destination: "BD", cities: [["Dakka", ["Gulshan", "Dhanmondi", "Mirpur"]], ["Chattogram", ["Panchlaish", "Halishahar", "Agrabad"]], ["Sylhet", ["Zindabazar", "Ambarkhana", "Shahjalal Upashahar"]]] },
    { code: "TD", country: "Çad", destination: "TD", cities: [["Encemine", ["Chagoua", "Farcha", "Moursal"]], ["Moundou", ["Dombao", "Doyon", "Guelkoura"]], ["Sarh", ["Kassai", "Paris-Congo", "Residentiel"]]] },
    { code: "ET", country: "Etiyopya", destination: "ET", cities: [["Addis Ababa", ["Bole", "Yeka", "Kirkos"]], ["Dire Dawa", ["Kezira", "Legehare", "Sabian"]], ["Mekelle", ["Hawelti", "Ayder", "Adi Haki"]]] },
    { code: "PS", country: "Filistin", destination: "PS_GAZZE", cities: [["Gazze", ["Er-Rimal", "Şucaiyye", "Zeytun"]], ["Han Yunus", ["El-Emel", "El-Manara", "El-Katiba"]], ["Refah", ["El-Cenine", "Tel es-Sultan", "Eş-Şabura"]]] },
    { code: "CM", country: "Kamerun", destination: "CM", cities: [["Yaounde", ["Bastos", "Mvan", "Etoudi"]], ["Douala", ["Bonanjo", "Akwa", "Bonamoussadi"]], ["Garoua", ["Roumde Adjia", "Lainde", "Marouare"]]] },
    { code: "SO", country: "Somali", destination: "SO", cities: [["Mogadişu", ["Hodan", "Wadajir", "Hamar Weyne"]], ["Hargeysa", ["Ahmed Dhagah", "26 June", "New Hargeysa"]], ["Kismayo", ["Farjano", "Faanoole", "Calanley"]]] },
    { code: "SY", country: "Suriye", destination: "SY", cities: [["Şam", ["Mezze", "Berze", "Meydan"]], ["Halep", ["El-Cemiliye", "El-Aziziye", "Yeni Halep"]], ["Humus", ["El-Hamidiye", "El-Vaer", "Baba Amr"]]] },
    { code: "TZ", country: "Tanzanya", destination: "TZ", cities: [["Darüsselam", ["Ilala", "Kinondoni", "Temeke"]], ["Arusha", ["Sekei", "Kaloleni", "Olasiti"]], ["Mwanza", ["Nyamagana", "Ilemela", "Pamba"]]] },
  ] as const;
  const internationalTypeCodes = ["GENEL_BAGIS", "GIDA_KOLISI", "BURS", "YETIM", "DOGAL_AFET", "SOSYAL_HIZMET", "IFTAR", "ZEKAT"] as const;
  const internationalPaymentCodes = ["BANK", "CASH", "ONLINE_DONATION", "POS_DEVICE"] as const;
  const internationalDonorNames = [["Abdul", "Rahman"], ["Fatima", "Noor"], ["Mohamed", "Ali"], ["Amina", "Hassan"], ["Yusuf", "Ibrahim"], ["Mariam", "Ahmed"], ["Omar", "Khalil"], ["Zahra", "Mahmud"], ["Idris", "Suleiman"], ["Samira", "Nasser"], ["Hodan", "Abdi"], ["Nadia", "Bekele"], ["Karim", "Diallo"], ["Salma", "Jahan"], ["Ismail", "Mtemi"]] as const;
  let internationalIndex = 0;
  for (const location of internationalProvinceHierarchy) {
    const countryDefinition = await prisma.definition.upsert({
      where: { type_code: { type: "ORIGIN_COUNTRY", code: location.code } },
      update: { name: location.country, isActive: true },
      create: { type: "ORIGIN_COUNTRY", code: location.code, name: location.country, isActive: true },
    });
    const destinationCountryId = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "DESTINATION_COUNTRY", code: location.destination } } })).id;
    for (const [city, cityDistricts] of location.cities) {
      const cityCode = `${location.code}-${city.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]+/g, "_")}`.slice(0, 80);
      const cityDefinition = await prisma.definition.upsert({
        where: { type_code: { type: "ORIGIN_CITY", code: cityCode } },
        update: { name: city, parentId: countryDefinition.id, isActive: true },
        create: { type: "ORIGIN_CITY", code: cityCode, name: city, parentId: countryDefinition.id, isActive: true },
      });
      for (const district of cityDistricts) {
        internationalIndex++;
        const districtCode = `${cityCode}-${district.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]+/g, "_")}`.slice(0, 80);
        await prisma.definition.upsert({
          where: { type_code: { type: "ORIGIN_DISTRICT", code: districtCode } },
          update: { name: district, parentId: cityDefinition.id, isActive: true },
          create: { type: "ORIGIN_DISTRICT", code: districtCode, name: district, parentId: cityDefinition.id, isActive: true },
        });
        const phone = `+990${String(internationalIndex).padStart(9, "0")}`;
        const [firstName, lastName] = internationalDonorNames[(internationalIndex - 1) % internationalDonorNames.length];
        const donor = await prisma.donor.upsert({
          where: { normalizedPhone: phone },
          update: { firstName, lastName, phoneCountry: location.code, originCountry: location.country, originCity: city, originDistrict: district },
          create: { firstName, lastName, normalizedPhone: phone, phoneCountry: location.code, originCountry: location.country, originCity: city, originDistrict: district },
        });
        const typeCode = internationalTypeCodes[(internationalIndex - 1) % internationalTypeCodes.length];
        const paymentCode = internationalPaymentCodes[(internationalIndex - 1) % internationalPaymentCodes.length];
        const typeId = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "DONATION_TYPE", code: typeCode } } })).id;
        const groupId = generalDefinitionId("GENERAL_DONATION_GROUP", defaultGeneralGroupCode(typeCode, "GIDA_KOLISI"));
        const paymentMethodId = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "PAYMENT_METHOD", code: paymentCode } } })).id;
        const amount = 700 + internationalIndex * 85;
        await prisma.donation.upsert({
          where: { idempotencyKey: `international-province-seed-${String(internationalIndex).padStart(3, "0")}` },
          update: { donorId: donor.id, typeId, groupId, destinationCountryId, paymentMethodId, quantity: 1, unitType: "Adet", unitPrice: amount, amount, status: "COMPLETED" },
          create: { donorId: donor.id, createdById: admin.id, typeId, groupId, destinationCountryId, quantity: 1, unitType: "Adet", unitPrice: amount, amount, currencyId: tryCurrency.id, paymentMethodId, description: `${location.country} / ${city} / ${district} bağışı`, idempotencyKey: `international-province-seed-${String(internationalIndex).padStart(3, "0")}`, payment: { create: { amount, currencyId: tryCurrency.id, methodId: paymentMethodId, status: "PAID" } }, receipt: { create: { number: `ULKE-2026-${String(internationalIndex).padStart(3, "0")}`, issuedAt: new Date(Date.UTC(2026, 5 + (internationalIndex % 2), 1 + (internationalIndex % 27))) } } },
        });
      }
    }
  }

  const dailyInKindSeeds = [
    ["Nermin", "Yalçın", "+905330002001", "İstanbul", "Fatih", "COCUK_VE_HASTA_BEZI", "TR", 2, 1850, 2],
    ["Ahmet", "Karaca", "+905330002002", "Ankara", "Çankaya", "PATATES", "TR", 10, 320, 3],
    ["Merve", "Acar", "+905330002003", "Bursa", "Nilüfer", "ELMA", "AFRICA", 12, 275, 4],
    ["Hasan", "Çetin", "+905330002004", "İzmir", "Konak", "GIYIM", "SY", 8, 650, 5],
    ["Esra", "Güneş", "+905330002005", "İstanbul", "Üsküdar", "UN", "SO", 20, 240, 6],
    ["Mehmet", "Polat", "+905330002006", "Ankara", "Keçiören", "TEMIZLIK_URUNLERI", "AF", 6, 575, 7],
    ["Sibel", "Erdem", "+905330002007", "Bursa", "Osmangazi", "BATTANIYE", "PS_GAZZE", 5, 900, 8],
    ["Ömer", "Kılıç", "+905330002008", "İzmir", "Bornova", "BEBEK_MAMASI", "BD", 9, 480, 9],
    ["Leyla", "Başar", "+905330002009", "İstanbul", "Kadıköy", "GIDA_KOLISI", "ET", 7, 1250, 10],
    ["Cem", "Taş", "+905330002010", "Ankara", "Yenimahalle", "HIJYEN_PAKETI", "YE", 11, 410, 11],
  ] as const;
  const inKindTypeId = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "DONATION_TYPE", code: "AYNI" } } })).id;
  const inKindPaymentId = (await prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "PAYMENT_METHOD", code: "SAME_PAYMENT" } } })).id;
  for (const [index, seed] of dailyInKindSeeds.entries()) {
    const [firstName, lastName, phone, city, district, groupCode, destinationCode, quantity, unitPrice, day] = seed;
    const donor = await prisma.donor.upsert({
      where: { normalizedPhone: phone },
      update: { firstName, lastName, phoneCountry: "TR", originCountry: "Türkiye", originCity: city, originDistrict: district },
      create: { firstName, lastName, normalizedPhone: phone, phoneCountry: "TR", originCountry: "Türkiye", originCity: city, originDistrict: district },
    });
    const [group, destination] = await Promise.all([
      prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "GENERAL_DONATION_GROUP", code: groupCode } } }),
      prisma.definition.findUniqueOrThrow({ where: { type_code: { type: "DESTINATION_COUNTRY", code: destinationCode } } }),
    ]);
    const amount = quantity * unitPrice;
    const createdAt = new Date(Date.UTC(2026, 0, day, 12));
    await prisma.donation.upsert({
      where: { idempotencyKey: `daily-in-kind-seed-${String(index + 1).padStart(3, "0")}` },
      update: { donorId: donor.id, typeId: inKindTypeId, groupId: group.id, destinationCountryId: destination.id, quantity, unitType: "Adet", unitPrice, amount, currencyId: tryCurrency.id, paymentMethodId: inKindPaymentId, createdAt, status: "COMPLETED" },
      create: {
        donorId: donor.id, createdById: admin.id, typeId: inKindTypeId, groupId: group.id, destinationCountryId: destination.id,
        quantity, unitType: "Adet", unitPrice, amount, currencyId: tryCurrency.id, paymentMethodId: inKindPaymentId,
        description: `${city} / ${district} kaynaklı ${group.name.toLocaleLowerCase("tr-TR")} ayni bağışı`,
        idempotencyKey: `daily-in-kind-seed-${String(index + 1).padStart(3, "0")}`, createdAt,
        payment: { create: { amount, currencyId: tryCurrency.id, methodId: inKindPaymentId, status: "PAID", createdAt } },
        receipt: { create: { number: `AYNI-2026-${String(index + 1).padStart(3, "0")}`, issuedAt: createdAt, createdAt } },
      },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "organization" },
    update: {
      value: {
        organizationName: "Yedirenk Derneği Bağış Yönetimi",
        receiptPrefix: "BGS",
        defaultCattleShareCapacity: 7,
        defaultSmallAnimalShareCapacity: 1,
      },
    },
    create: {
      key: "organization",
      value: {
        organizationName: "Yedirenk Derneği Bağış Yönetimi",
        receiptPrefix: "BGS",
        defaultCattleShareCapacity: 7,
        defaultSmallAnimalShareCapacity: 1,
      },
    },
  });

  const associationCount = await prisma.association.count();
  if (associationCount === 0) {
    await prisma.association.create({
      data: {
        name: "Yedirenk Derneği Bağış Yönetimi",
        shortName: "Yedirenk",
        logoDataUrl: "/yedirenk-logo.png",
        logoAlt: "Yedirenk Derneği kurumsal logosu",
        phone: "+90",
        website: null,
        isActive: true,
        isDefault: true,
        sortOrder: 0,
      },
    });
  }

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "DATABASE_SEEDED", entityType: "System" },
  });
}

main()
  .finally(async () => prisma.$disconnect());
