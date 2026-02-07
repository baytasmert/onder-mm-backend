/**
 * Accounting & Tax Utilities
 * Mali Müşavirlik için özel hesaplayıcılar ve utils
 */

/**
 * 2026 Vergi Dilimleri (Gelir Vergisi)
 */
const TAX_BRACKETS_2026 = [
  { min: 0, max: 110000, rate: 15 },
  { min: 110000, max: 230000, rate: 20 },
  { min: 230000, max: 580000, rate: 27 },
  { min: 580000, max: 3000000, rate: 35 },
  { min: 3000000, max: Infinity, rate: 40 }
];

/**
 * SGK İşveren Primi Oranları 2026
 */
const SGK_EMPLOYER_RATES = {
  general: 0.205, // %20.5
  disease: 0.125, // %12.5
  disability: 0.02, // %2
  unemployment: 0.02, // %2
  total: 0.225 // %22.5
};

/**
 * SGK İşçi Primi Oranları 2026
 */
const SGK_EMPLOYEE_RATES = {
  general: 0.14, // %14
  disease: 0.05, // %5
  unemployment: 0.01, // %1
  total: 0.15 // %15
};

/**
 * Asgari Ücret 2026
 */
const MINIMUM_WAGE_2026 = {
  gross: 20002.50,
  net: 17002.12,
  month: 1
};

/**
 * Gelir Vergisi Hesaplama
 */
export const calculateIncomeTax = (annualIncome) => {
  let totalTax = 0;
  let previousMax = 0;

  for (const bracket of TAX_BRACKETS_2026) {
    if (annualIncome > bracket.min) {
      const taxableAmount = Math.min(annualIncome, bracket.max) - bracket.min;
      const bracketTax = taxableAmount * (bracket.rate / 100);
      totalTax += bracketTax;

      if (annualIncome <= bracket.max) break;
    }
  }

  const effectiveRate = (totalTax / annualIncome) * 100;

  return {
    annualIncome,
    totalTax: Math.round(totalTax * 100) / 100,
    netIncome: Math.round((annualIncome - totalTax) * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    monthlyNet: Math.round(((annualIncome - totalTax) / 12) * 100) / 100,
    breakdown: calculateTaxBreakdown(annualIncome)
  };
};

/**
 * Vergi Dilimlerine Göre Detaylı Hesaplama
 */
const calculateTaxBreakdown = (annualIncome) => {
  const breakdown = [];

  for (const bracket of TAX_BRACKETS_2026) {
    if (annualIncome > bracket.min) {
      const taxableAmount = Math.min(annualIncome, bracket.max) - bracket.min;
      const bracketTax = taxableAmount * (bracket.rate / 100);

      breakdown.push({
        bracket: `${bracket.min.toLocaleString('tr-TR')} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString('tr-TR')} TL`,
        rate: `%${bracket.rate}`,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        tax: Math.round(bracketTax * 100) / 100
      });

      if (annualIncome <= bracket.max) break;
    }
  }

  return breakdown;
};

/**
 * SGK Primi Hesaplama (İşveren + İşçi)
 */
export const calculateSGK = (grossSalary) => {
  const employerGeneral = grossSalary * SGK_EMPLOYER_RATES.general;
  const employerDisease = grossSalary * SGK_EMPLOYER_RATES.disease;
  const employerDisability = grossSalary * SGK_EMPLOYER_RATES.disability;
  const employerUnemployment = grossSalary * SGK_EMPLOYER_RATES.unemployment;

  const employeeGeneral = grossSalary * SGK_EMPLOYEE_RATES.general;
  const employeeDisease = grossSalary * SGK_EMPLOYEE_RATES.disease;
  const employeeUnemployment = grossSalary * SGK_EMPLOYEE_RATES.unemployment;

  const totalEmployerPremium = employerGeneral + employerDisability + employerUnemployment;
  const totalEmployeePremium = employeeGeneral + employeeUnemployment;

  // İşsizlik sigortası matrahı hesaplama (üst sınır var)
  const unemploymentCeiling = MINIMUM_WAGE_2026.gross * 7.5;
  const unemploymentBase = Math.min(grossSalary, unemploymentCeiling);

  return {
    grossSalary,
    employer: {
      general: Math.round(employerGeneral * 100) / 100,
      disease: Math.round(employerDisease * 100) / 100,
      disability: Math.round(employerDisability * 100) / 100,
      unemployment: Math.round(unemploymentBase * SGK_EMPLOYER_RATES.unemployment * 100) / 100,
      total: Math.round((totalEmployerPremium + (unemploymentBase * SGK_EMPLOYER_RATES.unemployment)) * 100) / 100
    },
    employee: {
      general: Math.round(employeeGeneral * 100) / 100,
      disease: Math.round(employeeDisease * 100) / 100,
      unemployment: Math.round(unemploymentBase * SGK_EMPLOYEE_RATES.unemployment * 100) / 100,
      total: Math.round((totalEmployeePremium + (unemploymentBase * SGK_EMPLOYEE_RATES.unemployment)) * 100) / 100
    },
    totalPremium: Math.round((totalEmployerPremium + totalEmployeePremium) * 100) / 100
  };
};

/**
 * Net Maaş Hesaplama (Brüt'ten Net'e)
 */
export const calculateNetSalary = (grossSalary, hasDisabilityDiscount = false) => {
  // SGK işçi primi
  const sgk = calculateSGK(grossSalary);
  const sgkDeduction = sgk.employee.total;

  // Gelir vergisi matrahı (brüt - sgk işçi payı)
  const taxBase = grossSalary - sgkDeduction;

  // Aylık gelir vergisi (yıllık / 12)
  const annualTaxBase = taxBase * 12;
  const annualTax = calculateIncomeTax(annualTaxBase).totalTax;
  const monthlyTax = annualTax / 12;

  // Damga vergisi (%0.759)
  const stampTax = grossSalary * 0.00759;

  // Engelli indirimi (varsa %50)
  const taxDiscount = hasDisabilityDiscount ? monthlyTax * 0.5 : 0;
  const finalTax = monthlyTax - taxDiscount;

  // Net maaş hesaplama
  const totalDeductions = sgkDeduction + finalTax + stampTax;
  const netSalary = grossSalary - totalDeductions;

  return {
    grossSalary,
    deductions: {
      sgk: Math.round(sgkDeduction * 100) / 100,
      incomeTax: Math.round(finalTax * 100) / 100,
      stampTax: Math.round(stampTax * 100) / 100,
      total: Math.round(totalDeductions * 100) / 100
    },
    netSalary: Math.round(netSalary * 100) / 100,
    employerCost: Math.round((grossSalary + sgk.employer.total) * 100) / 100,
    takeHomePercentage: Math.round((netSalary / grossSalary) * 10000) / 100
  };
};

/**
 * Brüt Maaş Hesaplama (Net'ten Brüt'e - Ters Hesaplama)
 */
export const calculateGrossSalary = (targetNetSalary, hasDisabilityDiscount = false) => {
  // İteratif yaklaşım ile brüt maaş bulma
  let low = targetNetSalary;
  let high = targetNetSalary * 2;
  let bestGuess = high;
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 1; // 1 TL tolerans

  while (iterations < maxIterations) {
    const mid = (low + high) / 2;
    const result = calculateNetSalary(mid, hasDisabilityDiscount);

    if (Math.abs(result.netSalary - targetNetSalary) < tolerance) {
      bestGuess = mid;
      break;
    }

    if (result.netSalary < targetNetSalary) {
      low = mid;
    } else {
      high = mid;
    }

    iterations++;
  }

  return calculateNetSalary(Math.round(bestGuess * 100) / 100, hasDisabilityDiscount);
};

/**
 * KDV Hesaplama
 */
export const calculateVAT = (amount, rate = 20, includesVAT = false) => {
  if (includesVAT) {
    // KDV dahil tutar verilmişse
    const baseAmount = amount / (1 + rate / 100);
    const vatAmount = amount - baseAmount;

    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: amount,
      vatRate: rate
    };
  } else {
    // KDV hariç tutar verilmişse
    const vatAmount = amount * (rate / 100);
    const totalAmount = amount + vatAmount;

    return {
      baseAmount: amount,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      vatRate: rate
    };
  }
};

/**
 * 2026 Vergi Takvimi
 */
export const TAX_CALENDAR_2026 = {
  january: [
    { date: '2026-01-15', description: 'Aralık ayı Muhtasar ve Prim Hizmet beyannamesi', type: 'declaration' },
    { date: '2026-01-26', description: 'Aralık ayı KDV beyannamesi', type: 'declaration' },
    { date: '2026-01-31', description: 'Aralık ayı Muhtasar, KDV ve ÖTV ödemesi', type: 'payment' }
  ],
  february: [
    { date: '2026-02-15', description: 'Ocak ayı Muhtasar ve Prim Hizmet beyannamesi', type: 'declaration' },
    { date: '2026-02-26', description: 'Ocak ayı KDV beyannamesi', type: 'declaration' },
    { date: '2026-02-28', description: 'Ocak ayı Muhtasar, KDV ve ÖTV ödemesi', type: 'payment' }
  ],
  // ... diğer aylar için benzer şekilde devam eder
};

/**
 * Vergi Takvimi Getir
 */
export const getTaxCalendar = (month = null) => {
  if (month) {
    return TAX_CALENDAR_2026[month.toLowerCase()] || [];
  }
  return TAX_CALENDAR_2026;
};

/**
 * Yaklaşan Vergi Ödemeleri
 */
export const getUpcomingTaxDates = (daysAhead = 30) => {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysAhead);

  const upcoming = [];

  Object.entries(TAX_CALENDAR_2026).forEach(([month, dates]) => {
    dates.forEach(item => {
      const itemDate = new Date(item.date);
      if (itemDate >= today && itemDate <= future) {
        upcoming.push({
          ...item,
          daysUntil: Math.ceil((itemDate - today) / (1000 * 60 * 60 * 24))
        });
      }
    });
  });

  return upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
};
