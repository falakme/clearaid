import type { ReliefProgram } from "./types";

/**
 * Document-translation modules shown on the dashboard.
 * Emergency modules are always anonymous; gated modules (medical, eviction,
 * housing, school) require sign-in unless an active emergency is present.
 * Sample texts are realistic-but-fictional and contain NO real PII.
 */
export const RELIEF_PROGRAMS: ReliefProgram[] = [
  {
    id: "emergency-housing",
    docType: "emergency",
    gated: false,
    category: "Emergency",
    title: "Emergency Housing Check",
    agency: "FEMA",
    description:
      "Temporary housing assistance for households displaced by a declared disaster.",
    officialUrl: "https://www.disasterassistance.gov/",
    sampleFormText: `FEDERAL EMERGENCY MANAGEMENT AGENCY — INDIVIDUALS AND HOUSEHOLDS PROGRAM (IHP)
TEMPORARY HOUSING ASSISTANCE — TERMS AND CONDITIONS

Pursuant to Section 408 of the Robert T. Stafford Disaster Relief and Emergency Assistance Act, as amended (42 U.S.C. 5174), applicants may be eligible for financial assistance to address disaster-caused housing needs.

DEADLINE: Applications for disaster DR-4729 must be received no later than 11:59 PM Central Time on August 30, 2025. Late applications will not be considered absent a documented showing of extraordinary circumstances.

REQUIRED SUPPORTING DOCUMENTATION: Applicant must provide (1) a government-issued photo identification; (2) proof of occupancy such as a utility bill or lease agreement dated within the disaster incident period; and (3) proof of identity for all household members listed.

By signing below at Part D, Line 17 (page 4), the applicant certifies under penalty of perjury that all information is true. Co-applicants must additionally sign at Part E (page 5).

NOTICE: Acceptance of IHP funds may affect eligibility for certain Small Business Administration disaster loans. Duplication of benefits is prohibited under Section 312 of the Stafford Act.`,
  },
];


RELIEF_PROGRAMS.push({
  id: "red-cross-food",
  docType: "emergency",
  gated: false,
  category: "Emergency",
  title: "Red Cross Food Aid",
  agency: "American Red Cross",
  description:
    "Emergency food and essential supplies distribution for affected residents.",
  officialUrl: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services.html",
  sampleFormText: `AMERICAN RED CROSS — DISASTER FOOD & ESSENTIAL SUPPLIES ASSISTANCE
PROGRAM ENROLLMENT AGREEMENT

The American Red Cross, a nonprofit humanitarian organization, provides emergency feeding and bulk distribution of essential relief items to individuals impacted by qualifying disaster events.

ENROLLMENT WINDOW: On-site enrollment closes September 12, 2025. Residents must enroll in person at a designated distribution center during this period to receive a household supply card.

WHAT TO BRING: Bring one form of photo identification and any document showing your current local address (a piece of mail, lease, or utility statement is acceptable). One enrollment per household.

SIGNATURE: Enrollee signs the acknowledgment box on the reverse side of the supply card upon first pickup.

PLEASE NOTE: Supplies are distributed while quantities last; enrollment does not guarantee a specific item. This assistance is provided free of charge — never pay anyone to enroll you.`,
});

RELIEF_PROGRAMS.push({
  id: "utility-relief",
  docType: "emergency",
  gated: false,
  category: "Emergency",
  title: "Utility Bill Relief",
  agency: "State Disaster Recovery Office",
  description:
    "One-time credit toward electricity and water bills for disaster-affected accounts.",
  officialUrl: "https://www.usa.gov/disaster-financial-help",
  sampleFormText: `STATE DISASTER RECOVERY OFFICE — UTILITY ARREARAGE RELIEF GRANT
APPLICATION TERMS

This program offers a one-time credit applied directly to a qualifying residential utility account for service addresses located within the declared disaster area.

SUBMISSION DEADLINE: Completed applications must be postmarked or submitted electronically by October 1, 2025.

DOCUMENTS REQUIRED: (a) your most recent utility bill showing the account number and service address; (b) a valid photo ID; and (c) proof of residency at the service address.

SIGN HERE: Applicant signature is required in the certification block on Page 2, bottom right. Unsigned applications are returned without processing.

IMPORTANT: Funds are paid directly to the utility provider, not to the applicant. Accepting this credit does not waive your eligibility for federal housing assistance.`,
});

RELIEF_PROGRAMS.push({
  id: "eviction-notice",
  docType: "eviction",
  gated: true,
  category: "Housing & Legal",
  title: "Eviction Notice Translator",
  agency: "Landlord / Court",
  description:
    "Understand an eviction or lease-termination notice: deadlines, your options, and what to gather.",
  officialUrl: "https://www.usa.gov/eviction",
  sampleFormText: `NOTICE TO QUIT AND VACATE — NON-PAYMENT OF RENT

TO THE TENANT(S) IN POSSESSION of the premises located at the address on file:

YOU ARE HEREBY NOTIFIED that rent in the amount of $1,850.00 is now past due for the rental period beginning the 1st of last month. Pursuant to applicable state landlord-tenant statutes, you are required to PAY the full amount due OR VACATE and surrender possession of the premises within FOURTEEN (14) DAYS of service of this notice, no later than the close of business on the 14th day.

IF YOU FAIL to either pay the amount demanded or vacate within this period, the landlord may commence summary eviction (unlawful detainer) proceedings against you in the appropriate court, which may result in a judgment for possession, money damages, and court costs.

You may dispute the amount claimed or assert legal defenses by responding in writing. Retain proof of any payments made. This notice is served on the date indicated below by the property manager of record.`,
});

RELIEF_PROGRAMS.push({
  id: "medical-bill",
  docType: "medical_bill",
  gated: true,
  category: "Medical",
  title: "Medical Bill Auditor",
  agency: "Hospital / Insurer",
  description:
    "Decode itemized medical charges and billing codes, and flag line items worth questioning.",
  officialUrl: "https://www.cms.gov/medical-bill-rights",
  sampleFormText: `MERCY GENERAL HOSPITAL — ITEMIZED STATEMENT OF SERVICES
Statement Date: 03/04/2025 | Amount Due: $2,431.78 | Due By: 04/03/2025

DATE      CODE     DESCRIPTION                                CHARGE
02/14/25  99285    EMERGENCY DEPT VISIT, HIGH COMPLEXITY      $1,240.00
02/14/25  80053    COMPREHENSIVE METABOLIC PANEL              $   312.00
02/14/25  71046    RADIOLOGIC EXAM, CHEST, 2 VIEWS            $   486.00
02/14/25  J1885    INJECTION, KETOROLAC, PER 15 MG            $    98.50
02/14/25  A9150    NON-PRESCRIPTION SELF-ADMIN DRUG           $    42.00
02/14/25  99070    SUPPLIES AND MATERIALS (STERILE TRAY)      $   165.00

Insurance adjustment applied. Patient responsibility reflects deductible and
coinsurance. Charges are subject to your plan's allowed amounts. Contact billing
within 30 days to dispute any line item.`,
});

RELIEF_PROGRAMS.push({
  id: "school-communication",
  docType: "school",
  gated: true,
  category: "School",
  title: "School Communication",
  agency: "School District",
  description:
    "Turn dense school letters (IEPs, enrollment, disciplinary notices) into clear next steps.",
  officialUrl: "https://www.ed.gov/",
  sampleFormText: `UNIFIED SCHOOL DISTRICT — NOTICE OF INDIVIDUALIZED EDUCATION PROGRAM (IEP) MEETING

Dear Parent/Guardian,

In accordance with the Individuals with Disabilities Education Act (IDEA), the district is convening a meeting of the IEP team to review and revise your child's educational program and to discuss eligibility for continued special education services.

MEETING DATE: The meeting is scheduled for March 21, 2025 at 3:30 PM. Please confirm your attendance no later than March 17, 2025.

You are a required member of the IEP team. You may bring documents, invite individuals with knowledge of your child, and request an interpreter at no cost. Please bring any recent evaluations or reports in your possession. You have the right to receive a copy of the proposed IEP and to consent to or decline the services offered.`,
});

RELIEF_PROGRAMS.push({
  id: "housing-form",
  docType: "housing",
  gated: true,
  category: "Government",
  title: "Housing Form Helper",
  agency: "Housing Authority",
  description:
    "Clarify Section 8 / public housing applications and recertification paperwork.",
  officialUrl: "https://www.hud.gov/topics/rental_assistance",
  sampleFormText: `HOUSING AUTHORITY — ANNUAL RECERTIFICATION OF ELIGIBILITY (HOUSING CHOICE VOUCHER)

This packet must be completed to continue receiving rental assistance. Failure to respond may result in termination of your housing assistance payments.

DEADLINE: Return all completed forms and documentation by May 15, 2025. Appointments missed without 48 hours' notice may be treated as a failure to recertify.

REQUIRED DOCUMENTATION: (1) proof of all household income for the past 60 days (pay stubs, benefit letters); (2) current government-issued photo ID for the head of household; (3) Social Security verification for each household member; (4) most recent utility statement.

Sign and date the Personal Declaration on Page 6 and the Authorization for Release of Information on Page 8. Unsigned packets cannot be processed.`,
});

export function getProgram(id: string): ReliefProgram | undefined {
  return RELIEF_PROGRAMS.find((p) => p.id === id);
}
