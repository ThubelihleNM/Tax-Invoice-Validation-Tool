export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  'india': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'in': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'south africa': { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  'za': { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  'united states': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'united states of america': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'usa': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'us': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'united kingdom': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'uk': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'gb': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'canada': { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  'ca': { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  'australia': { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  'au': { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  'united arab emirates': { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  'uae': { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  'ae': { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  'nigeria': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  'ng': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  'kenya': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  'ke': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  'zimbabwe': { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold' },
  'zw': { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold' },
  'germany': { code: 'EUR', symbol: '€', name: 'Euro' },
  'france': { code: 'EUR', symbol: '€', name: 'Euro' },
  'italy': { code: 'EUR', symbol: '€', name: 'Euro' },
  'spain': { code: 'EUR', symbol: '€', name: 'Euro' },
  'japan': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  'jp': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  'singapore': { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
  'sg': { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
  'switzerland': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  'ch': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
};

export const CURRENCY_CODE_MAP: Record<string, CurrencyInfo> = {
  'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'ZAR': { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  'USD': { code: 'USD', symbol: '$', name: 'US Dollar' },
  'GBP': { code: 'GBP', symbol: '£', name: 'British Pound' },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro' },
  'CAD': { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  'AUD': { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  'AED': { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  'NGN': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  'KES': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  'ZWG': { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold' },
  'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  'SGD': { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
  'CHF': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
};

/**
 * Resolves currency code and symbol based on currency code, country name, or a user object.
 */
export const getCurrencyInfo = (input?: { currency?: string; currency_symbol?: string; country?: string } | string | null): CurrencyInfo => {
  if (!input) {
    return { code: 'USD', symbol: '$', name: 'US Dollar' };
  }

  // If input is an object (like User)
  if (typeof input === 'object') {
    // 1. If explicit currency is specified and valid
    if (input.currency && CURRENCY_CODE_MAP[input.currency.toUpperCase()]) {
      const info = CURRENCY_CODE_MAP[input.currency.toUpperCase()];
      return {
        ...info,
        symbol: input.currency_symbol || info.symbol
      };
    }

    // 2. Resolve from country name if available
    if (input.country) {
      const cleanCountry = input.country.trim().toLowerCase();
      if (COUNTRY_CURRENCY_MAP[cleanCountry]) {
        return COUNTRY_CURRENCY_MAP[cleanCountry];
      }
    }

    if (input.currency) {
      return {
        code: input.currency,
        symbol: input.currency_symbol || '$',
        name: input.currency
      };
    }

    return { code: 'USD', symbol: '$', name: 'US Dollar' };
  }

  // If input is string (currency code or country name)
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (CURRENCY_CODE_MAP[upper]) {
    return CURRENCY_CODE_MAP[upper];
  }

  const lower = trimmed.toLowerCase();
  if (COUNTRY_CURRENCY_MAP[lower]) {
    return COUNTRY_CURRENCY_MAP[lower];
  }

  return { code: upper || 'USD', symbol: '$', name: upper || 'USD' };
};

/**
 * Formats a numeric amount with the appropriate currency symbol according to the chosen country/currency.
 * Example for India: ₹1,250.00
 */
export const formatCurrency = (
  amount?: number | string | null,
  currencySource?: { currency?: string; currency_symbol?: string; country?: string } | string | null
): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0')) || 0;
  const info = getCurrencyInfo(currencySource);
  
  const formattedNum = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${info.symbol}${formattedNum}`;
};
