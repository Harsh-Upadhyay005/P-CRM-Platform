export const STATE_CODES = [
  'AN',
  'AP',
  'AR',
  'AS',
  'BR',
  'CH',
  'CT',
  'DN',
  'DD',
  'DL',
  'GA',
  'GJ',
  'HR',
  'HP',
  'JK',
  'JH',
  'KA',
  'KL',
  'LA',
  'LD',
  'MP',
  'MH',
  'MN',
  'ML',
  'MZ',
  'NL',
  'OR',
  'PY',
  'PB',
  'RJ',
  'SK',
  'TN',
  'TS',
  'TR',
  'UP',
  'UT',
  'WB',
] as const;

export type StateCode = (typeof STATE_CODES)[number];

const STATE_NAME_TO_CODE: Record<string, StateCode> = {
  'andaman and nicobar islands': 'AN',
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  assam: 'AS',
  bihar: 'BR',
  chandigarh: 'CH',
  chhattisgarh: 'CT',
  'dadra and nagar haveli and daman and diu': 'DN',
  'dadra and nagar haveli': 'DN',
  daman: 'DD',
  diu: 'DD',
  delhi: 'DL',
  goa: 'GA',
  gujarat: 'GJ',
  haryana: 'HR',
  'himachal pradesh': 'HP',
  'jammu and kashmir': 'JK',
  jharkhand: 'JH',
  karnataka: 'KA',
  kerala: 'KL',
  ladakh: 'LA',
  lakshadweep: 'LD',
  'madhya pradesh': 'MP',
  maharashtra: 'MH',
  manipur: 'MN',
  meghalaya: 'ML',
  mizoram: 'MZ',
  nagaland: 'NL',
  odisha: 'OR',
  orissa: 'OR',
  puducherry: 'PY',
  'pondicherry': 'PY',
  punjab: 'PB',
  rajasthan: 'RJ',
  sikkim: 'SK',
  'tamil nadu': 'TN',
  telangana: 'TS',
  tripura: 'TR',
  'uttar pradesh': 'UP',
  uttarakhand: 'UT',
  'west bengal': 'WB',
};

const STATE_CODE_TO_LABEL: Record<StateCode, string> = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CH: 'Chandigarh',
  CT: 'Chhattisgarh',
  DN: 'Dadra and Nagar Haveli and Daman and Diu',
  DD: 'Daman and Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  JH: 'Jharkhand',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MP: 'Madhya Pradesh',
  MH: 'Maharashtra',
  MN: 'Manipur',
  ML: 'Meghalaya',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OR: 'Odisha',
  PY: 'Puducherry',
  PB: 'Punjab',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TS: 'Telangana',
  TR: 'Tripura',
  UP: 'Uttar Pradesh',
  UT: 'Uttarakhand',
  WB: 'West Bengal',
};

export const getStateLabelFromCode = (code: string): string => {
  const normalized = String(code || '').toUpperCase() as StateCode;
  return STATE_CODE_TO_LABEL[normalized] ?? normalized;
};

type InferredLocation = {
  stateCode: string;
  stateLabel: string;
  districtLabel: string;
};

const cleanToken = (value: string) =>
  value
    .trim()
    .replace(/\b\d{6}\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .trim();

const resolveStateFromToken = (token: string): { code: StateCode; label: string } | null => {
  const normalizedName = token.toLowerCase();
  const byName = STATE_NAME_TO_CODE[normalizedName];
  if (byName) {
    return {
      code: byName,
      label: STATE_CODE_TO_LABEL[byName] ?? token,
    };
  }

  const normalizedCode = token.toUpperCase().replace(/\./g, '');
  const aliasCodeMap: Record<string, StateCode> = {
    TG: 'TS',
    UK: 'UT',
    OD: 'OR',
  };
  const resolvedCode = aliasCodeMap[normalizedCode] ?? normalizedCode;

  if ((STATE_CODES as readonly string[]).includes(resolvedCode)) {
    const code = resolvedCode as StateCode;
    return {
      code,
      label: STATE_CODE_TO_LABEL[code] ?? code,
    };
  }

  return null;
};

export const inferLocationFromServiceArea = (area: string): InferredLocation | null => {
  if (!area) return null;

  const tokens = area
    .split(',')
    .map(cleanToken)
    .filter(Boolean);

  if (!tokens.length) return null;

  const stateIndex = tokens.findIndex((token) => !!resolveStateFromToken(token));
  if (stateIndex < 0) return null;

  const resolvedState = resolveStateFromToken(tokens[stateIndex]);
  if (!resolvedState) return null;

  const stateCode = resolvedState.code;
  const stateLabel = resolvedState.label;
  const districtLabel = tokens[stateIndex - 1] ?? tokens[0] ?? stateLabel;

  if (!districtLabel) return null;

  return {
    stateCode,
    stateLabel,
    districtLabel,
  };
};

export const inferLocationFromServiceAreas = (areas: string[] | undefined): InferredLocation | null => {
  if (!areas || areas.length === 0) return null;
  for (const area of areas) {
    const inferred = inferLocationFromServiceArea(area);
    if (inferred) return inferred;
  }
  return null;
};
