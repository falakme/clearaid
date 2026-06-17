/**
 * Judge Demo Mode — synthetic, complex documents used to demonstrate the full
 * pipeline instantly, without manual uploads. Each one auto-populates the
 * input and is processed end-to-end so judges see real, structured results.
 *
 * All content is synthetic and contains no real personal data.
 */

export interface DemoDoc {
  key: string;
  /** Button label shown in the Judge Demo Mode banner. */
  label: string;
  /** Short caption describing the scenario. */
  caption: string;
  /** Domain hint forwarded to the AI prompt. */
  docType: "emergency" | "general";
  /** The synthetic document text loaded into the input. */
  text: string;
}

export const DEMO_DOCS: DemoDoc[] = [
  {
    key: "eviction",
    label: "Load Eviction Crisis",
    caption: "A complex lease-termination / unlawful-detainer notice.",
    docType: "general",
    text: `SUPERIOR COURT OF THE STATE OF CALIFORNIA — COUNTY OF ALAMEDA
NOTICE OF TERMINATION OF TENANCY AND UNLAWFUL DETAINER
THREE (3) DAY NOTICE TO PAY RENT OR QUIT — Premises: 1422 Foothill Blvd, Apt 3B, Oakland, CA 94601

TO TENANT(S) AND ALL OTHERS IN POSSESSION: YOU ARE HEREBY NOTIFIED that rent is now due and payable upon the above-described premises in the total delinquent amount of THREE THOUSAND SEVEN HUNDRED DOLLARS ($3,700.00), representing unpaid rent for the months of April and May together with a late charge of $200.00 assessed pursuant to Paragraph 7 of the residential lease executed on or about January 1.

WITHIN THREE (3) DAYS, excluding Saturdays, Sundays, and judicial holidays, after service of this notice upon you, you are required to PAY the rent in full OR to surrender and deliver up possession of the premises. SHOULD YOU FAIL to do either, the Landlord ELECTS TO DECLARE THE FORFEITURE of your lease and WILL INSTITUTE LEGAL PROCEEDINGS (Unlawful Detainer) against you to recover possession, treble damages, and costs of suit.

A judgment for possession entered against you may be reported to unlawful-detainer registries and consumer credit bureaus and may impair your ability to rent in the future. You may have a right to a jury trial and to assert affirmative defenses. State rental-assistance programs and local legal aid may be available. This notice is given pursuant to Code of Civil Procedure section 1161(2).`,
  },
  {
    key: "hospital",
    label: "Load Hospital Discharge",
    caption: "A confusing post-discharge medical instruction sheet.",
    docType: "general",
    text: `REGIONAL MEDICAL CENTER — AFTER VISIT SUMMARY & DISCHARGE INSTRUCTIONS
Patient discharged from Inpatient Cardiology. Primary diagnosis: paroxysmal atrial fibrillation with rapid ventricular response (I48.0). Secondary: essential hypertension (I10).

MEDICATIONS — RECONCILED LIST:
- Apixaban 5 mg PO BID. ANTICOAGULANT. Do NOT discontinue without contacting Cardiology. Bleeding precautions apply.
- Metoprolol succinate ER 50 mg PO daily. Hold and call if HR < 55 or SBP < 100.
- Furosemide 20 mg PO daily in the AM. Daily weights; report gain > 3 lb in 24 hrs or 5 lb in a week.

FOLLOW-UP:
- INR / anticoagulation clinic in 5-7 days. Coagulation monitoring required.
- Cardiology (Dr. Okafor) in 2 weeks; bring your blood pressure and weight log.
- Obtain a home BP cuff. Record AM and PM readings.

RETURN PRECAUTIONS — proceed to the nearest Emergency Department for: chest pain or pressure, syncope, dyspnea at rest, unilateral weakness or speech difficulty, or any uncontrolled bleeding. Activity: no heavy lifting > 10 lb for 1 week. A 30-day event monitor will be mailed; wear continuously and mail back in the prepaid envelope.`,
  },
  {
    key: "food",
    label: "Load Food Assistance",
    caption: "A dense state SNAP eligibility policy document.",
    docType: "general",
    text: `STATE DEPARTMENT OF HUMAN SERVICES — SUPPLEMENTAL NUTRITION ASSISTANCE PROGRAM (SNAP)
NOTICE OF ELIGIBILITY DETERMINATION AND CONTINUING REPORTING OBLIGATIONS — Case Reference 7XX-XXXXX

Your household has been determined CATEGORICALLY ELIGIBLE for SNAP benefits subject to the gross and net income standards set forth in 7 CFR 273.9. Based on a household size of four (4), the applicable gross monthly income limit is $3,380 (130% of the Federal Poverty Level) and the net monthly income limit is $2,600 (100% FPL) after allowable deductions, including the 20% earned-income deduction, the standard deduction, dependent-care costs, and the excess shelter deduction capped per the current schedule.

MONTHLY ALLOTMENT: $766, issued via Electronic Benefits Transfer (EBT) on the 7th of each month.

PERIODIC REPORTING: You are assigned to SIMPLIFIED REPORTING. You must report when your household's gross monthly income EXCEEDS the limit above, and you must submit an Interim Report (Form DHS-2200) at month six (6) of your twelve (12) month certification period. Failure to return the Interim Report by the due date will result in CASE CLOSURE. Intentional Program Violations may result in disqualification and recovery of overissued benefits. You have the right to a Fair Hearing within 90 days of this notice. Able-Bodied Adults Without Dependents (ABAWDs) are subject to a time limit and work requirement absent an applicable exemption or waiver.`,
  },
];
