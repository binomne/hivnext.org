/* =====================================================================
   HIVnext site configuration
   ---------------------------------------------------------------------
   This is the ONLY file you normally need to edit.
   - Add a changelog entry  -> CHANGELOG (newest can go anywhere; sorted by date)
   - Change an NGO link      -> NGOS
   - Change an external URL  -> LINKS
   - Edit a FAQ              -> FAQ
   Keep the JSON-like syntax: quotes around text, commas between items.
   ===================================================================== */

const SITE = {
  email: "hivnext@myaids.org.my",
  org: "Malaysian AIDS Foundation / Malaysian AIDS Council",
  orgUrl: "https://myaids.org.my",
  youtube: "https://youtube.com/@HIVnext",
  // Legacy > Data Correction Request. Paste the URL from Google Forms:
  // Send -> "<>" (Embed) -> copy the src="..." value.
  correctionFormEmbed: "https://docs.google.com/forms/d/e/1FAIpQLSfjrQ3c2ZHeapTUYLeEQ2hlgZjHpwpGSAKh6t9VmE2zE9m36w/viewform?embedded=true",
  correctionFormOpen:  "https://forms.gle/wGQ2BJzuuaeJHn6H6"
};

const LINKS = {
  dhs:        "https://dhs.hivnext.org",           // main system (not live yet)
  myvasLogin: "https://myvas.moh.gov.my/checkin/",
  protectnow: "https://linktr.ee/ProtectNow",
  testnow:    "https://testnow.com.my/",
  myprep:     "https://mypreplocator.com/",
  mydigitalId:"https://www.digital-id.my/",
  myvasHelpdesk: "myvashelpdesk@mysejahtera.org"
};

/* All-NGO Performance Dashboard (Legacy page). Password gate is client-side: the browser compares a
   SHA-256 hash, so the password itself is not written in this file. To change it, run in any browser console:
   crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEW-PASSWORD")).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")))  */
const DASHBOARD = {
  embed: "https://datastudio.google.com/embed/reporting/60531b84-1575-4c13-98df-94e9530f781a/page/p_0swkvw39qd",
  open:  "https://datastudio.google.com/s/pa9PKyKaBiM",
  hash:  "9d7229f03bd64531eb532f9c87283c0261e4586c8e5de20d2c3e3c12f537c20f"
};

/* Legacy portal: one entry per NGO. Order inside a region follows "num". */
const REGIONS = ["Northern", "Eastern", "Central", "Southern", "Borneo"];

const NGOS = [
  {
    "num": "01",
    "name": "Cahaya Harapan",
    "region": "Northern",
    "db": "https://docs.google.com/spreadsheets/d/15pxWzOOKrazSCfoXp9NBUDSsSsrXCu5DN4l_Xwhv8lM/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/631e99bd-be36-41b6-8ae8-1b33ed9617a5"
  },
  {
    "num": "02",
    "name": "AARG",
    "region": "Northern",
    "db": "https://docs.google.com/spreadsheets/d/1oaFp05VRO5dyixjzeeBcfXwVCe76sYVHQTf_5qqTtkI/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/090d4c94-62bf-4268-a896-d2d465481c5d"
  },
  {
    "num": "03",
    "name": "FHDA",
    "region": "Northern",
    "db": "https://docs.google.com/spreadsheets/d/1wNKf_lVtzmrFqsRGvhi-X01NOso_9mG56jhCeVK6O_s/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/b5f45dc6-1be3-4d4d-82e3-01f3097e182b"
  },
  {
    "num": "04",
    "name": "PERKASIH",
    "region": "Northern",
    "db": "https://docs.google.com/spreadsheets/d/1VL1FptPGOthLvbc9uzCqevrMOjvkrwtphLyvbjghMF8/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/568cc53b-f1cd-42e1-baf9-386cee690bf0"
  },
  {
    "num": "05",
    "name": "SAHABAT",
    "region": "Eastern",
    "db": "https://docs.google.com/spreadsheets/d/19R4oieP7WAYOColw0RTSlaUXCDuwohwrHx9iH8OK45w/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/134cf8e6-f626-4b19-9f24-b56552a11306"
  },
  {
    "num": "06",
    "name": "PELITA",
    "region": "Eastern",
    "db": "https://docs.google.com/spreadsheets/d/19IhgvPit94cTo86wQX2Akr0lRZUFdYKW2Ygzpcp8I14/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/0197b67e-0caa-4db9-aebb-a980f8fe5d6e"
  },
  {
    "num": "07",
    "name": "KARISMA",
    "region": "Eastern",
    "db": "https://docs.google.com/spreadsheets/d/1EgwOTAJtNVkhruYqhtHnly4LYsJqXFX0CXcpeiildBc/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/8f10e91c-a40b-4f86-9d5f-9bab8bf7e460"
  },
  {
    "num": "08",
    "name": "KOMITED",
    "region": "Eastern",
    "db": "https://docs.google.com/spreadsheets/d/1LM0EJo1pj_OWI2UdxWcO053rCeUx-5qr_1c6lCTdWOM/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/822fe3d4-b611-4f59-83d9-a8c2d434b3f3"
  },
  {
    "num": "10",
    "name": "KLASS",
    "region": "Central",
    "db": "https://docs.google.com/spreadsheets/d/1HEwOeJPWFFNzc-KYcq65fxEol3LMrHNFdibc8cKHiF8/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/c7145f6b-1a97-4de0-a780-61f9c78af910"
  },
  {
    "num": "11",
    "name": "PTF",
    "region": "Central",
    "db": "https://docs.google.com/spreadsheets/d/1FYeL89EOwJwtiiDKKUHHbEP2we2NSmjPhavPdZ2Joic/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/985c6dd1-8dd2-49b5-89cd-43ccfddeb274"
  },
  {
    "num": "12",
    "name": "Insaf Murni",
    "region": "Central",
    "db": "https://docs.google.com/spreadsheets/d/1mrMVfCNLrDR_lKJIsM7sV5db64Y6_cmZKURcYys0y8o/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/b11c8fe8-85d0-4bd3-8a23-c44cbe90f2b3"
  },
  {
    "num": "13",
    "name": "SEED",
    "region": "Central",
    "db": "https://docs.google.com/spreadsheets/d/1mlPAldRKLsAa3UjPPaN3jqxe3ARQhEgP6jjPCesfZvY/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/3642cdb9-6e6a-40c4-b633-8545b93351dc"
  },
  {
    "num": "14",
    "name": "PKKUM",
    "region": "Central",
    "db": "https://docs.google.com/spreadsheets/d/1iefqUEM4NdZcspoL-swP_1SJ4uFoMgM7qVyYRn03m3Y/edit?usp=sharing",
    "dash": "https://datastudio.google.com/reporting/9bcfab13-664e-48b7-b9be-55d2a220ebd8"
  },
  {
    "num": "15",
    "name": "MyKEKASIH",
    "region": "Southern",
    "db": "https://docs.google.com/spreadsheets/d/1Tl6j1CNn7cLgC1Ujdryo5zLXHUwt1r2vzw2hXjghWCA/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/3531c672-b985-422f-9f19-d586011ddd4d"
  },
  {
    "num": "16",
    "name": "KSM",
    "region": "Southern",
    "db": "https://docs.google.com/spreadsheets/d/1Hpe9eQ1BctViB8B4rD6EHivbKalECIy7ALpq7FN3baM/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/cb92044d-052b-4b57-9b39-bde3a8fd0d2c"
  },
  {
    "num": "17",
    "name": "KAMILIA",
    "region": "Southern",
    "db": "https://docs.google.com/spreadsheets/d/18cEuu_L6JJJfhij9T-bHzIftGUhpKeLkjL5mhn2ULqg/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/f5299355-f5e9-4a8b-8573-401b2900fa82"
  },
  {
    "num": "18",
    "name": "ILZ",
    "region": "Southern",
    "db": "https://docs.google.com/spreadsheets/d/1yyHcl3h0IVUGJO9zf771g5txI2jRRrRqGLzEbRLGsiI/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/dcabd229-477a-4d6d-89eb-dd117be9bfef"
  },
  {
    "num": "19",
    "name": "SACS",
    "region": "Borneo",
    "db": "https://docs.google.com/spreadsheets/d/1toQZi6LEELzvdt9tVWNkUAqTpwv-E_P909id9llKsMs/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/381ae6e2-774b-446a-b075-54e74d32c892"
  },
  {
    "num": "20",
    "name": "MAF",
    "region": "Borneo",
    "db": "https://docs.google.com/spreadsheets/d/1ZoEXET8URHitpXuU_-uMVEw8LzXN4xjtt53p_GUZvG4/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/aeb0bea3-e774-4ecd-91d8-b5b374825c46"
  },
  {
    "num": "21",
    "name": "KASIH",
    "region": "Borneo",
    "db": "https://docs.google.com/spreadsheets/d/1JQJGp7Wy7jiXlDTVkHCzv1kq7TP_moN6Sv1gw9b-cBI/edit?usp=drive_link",
    "dash": "https://datastudio.google.com/reporting/3a471293-a74c-44a4-b7fa-872e85f3c75b"
  }
];

const CHANGELOG = [
  {
    "date": "2025-12-01",
    "title": "Login/register setup",
    "desc": "Initial authentication system and project scaffolding."
  },
  {
    "date": "2025-12-15",
    "title": "RBAC + ABAC setup",
    "desc": "Role-Based and Attribute-Based Access Control architecture defined."
  },
  {
    "date": "2026-01-10",
    "title": "Modules planning",
    "desc": "All HIVnext modules scoped: DHSKP, CBC, TestNow, KAMI, Admin Panel."
  },
  {
    "date": "2026-02-13",
    "title": "RBAC complete, UI/UX begins",
    "desc": "Access control implementation complete; UI design system initiated."
  },
  {
    "date": "2026-02-19",
    "title": "DHSKP Daily Data, Link to Care & Users",
    "desc": "Core DHSKP data entry forms built with mock data integration."
  },
  {
    "date": "2026-03-15",
    "title": "DHSKP demo complete, MongoDB API begins",
    "desc": "Full DHSKP demo environment ready; MongoDB backend API development starts."
  },
  {
    "date": "2026-03-25",
    "title": "Referral schema in DHSKP",
    "desc": "Cross-site referral system schema designed and integrated into DHSKP."
  },
  {
    "date": "2026-03-30",
    "title": "Landing page, myHCC module, Admin Panel",
    "desc": "HIVnext landing page live; myHCC and Admin Panel modules delivered."
  },
  {
    "date": "2026-04-06",
    "title": "DHSKP backend estimated complete, dashboard demo begins",
    "desc": "DHSKP backend integration wrapping up; analytics dashboard demo started."
  },
  {
    "date": "2026-04-13",
    "title": "Dashboard estimated complete, backend integration begins",
    "desc": "Dashboard demo finalised; full backend integration phase begins."
  },
  {
    "date": "2026-04-20",
    "title": "TestNow module begins",
    "desc": "TestNow self-testing platform module development commenced."
  },
  {
    "date": "2026-05-04",
    "title": "CBC / Inventory / Staff / Reports modules begin",
    "desc": "Community-Based Care, Inventory, Staff Management, and Reports modules initiated."
  },
  {
    "date": "2026-06-05",
    "title": "HIVnext Legacy completely re-engineered",
    "desc": "Full architectural overhaul of the Legacy system completed — rebuilt from the ground up on the previous data architecture with improved structure, reliability, and maintainability."
  },
  {
    "date": "2026-06-06",
    "title": "Database replication completed for all NGOs",
    "desc": "Individual Google Sheets databases successfully replicated and configured for all 21 implementing partner NGOs, with access permissions set for respective Program Managers and Program Coordinators."
  },
  {
    "date": "2026-06-15",
    "title": "Historical data migration: 2024 and 2025 transferred",
    "desc": "NGO databases from the 2024 and 2025 program cycles fully migrated into the re-engineered Legacy system, preserving historical records for continuity and reference."
  },
  {
    "date": "2026-06-17",
    "title": "Automated workflow data update introduced",
    "desc": "An automated data workflow pipeline has been designed and staged across all NGO databases. Automation triggers are scheduled to go live on 25 June 2026, enabling hands-free routine data synchronisation."
  },
  {
    "date": "2026-06-19",
    "title": "Dashboard redesign: complete overhaul and new core architecture",
    "desc": "All NGO dashboards underwent a comprehensive redesign — new visual layout, restructured data architecture, and performance optimisations resulting in significantly faster load times."
  },
  {
    "date": "2026-06-21",
    "title": "Dashboard replication and sharing completed for all NGOs",
    "desc": "Redesigned dashboards successfully replicated and shared with all 21 implementing partner NGOs. Access granted to Program Managers, Program Coordinators, CHWs, CHNs, and Admin Officers."
  },
  {
    "date": "2026-06-23",
    "title": "First HIVnext Legacy training session conducted",
    "desc": "Initial training session on the HIVnext Legacy system delivered to implementing partner staff, covering database navigation, dashboard usage, and the upcoming HIVnext cloud platform migration pathway."
  },
  {
    "date": "2026-06-25",
    "title": "New data architecture deployed to further improve dashboard performance",
    "desc": "Advanced data architecture update pushed live — automated workflow triggers activated. Structural refinements further reduce query times and dashboard load latency across all NGO views."
  },
  {
    "date": "2026-06-26",
    "title": "Tutorial and YouTube channel launched",
    "desc": "An interactive Link to Care tutorial for Program Managers has been published in the Tutorials section, providing step-by-step guidance on updating client records in the Legacy system. The HIVnext YouTube channel has also been created as a dedicated hub for future hands-on video tutorials."
  },
  {
    "date": "2026-06-30",
    "title": "Interactive illustrated guide in progress",
    "desc": "Development of a fully illustrated, interactive guide is underway to assist Program Managers in navigating and operating the HIVnext system — combining visual walkthroughs with step-by-step instructions for a more intuitive onboarding experience."
  },
  {
    "date": "2026-09-12",
    "title": "Data Engine Refinement",
    "desc": "All Legacy databases now load far faster. The Query + IMPORTRANGE formulas that previously pulled data from the main table on every open have been replaced by Google Apps Script jobs that write the data directly into each NGO database. Sheets open on the data that is already there instead of recalculating it."
  },
  {
    "date": "2026-09-19",
    "title": "HIVnext Redesign (v2.0)",
    "desc": "hivnext.org rebuilt from the ground up. New launch screen with direct routes to every platform, dedicated pages that survive a refresh (/about, /legacy, /myvas), MyVAS user and admin guides in English, a redesigned Legacy guide, a Data Correction Request form and a Report a Bug form. The browser-only CMS has been removed in favour of a single editable config file."
  }
];

const FAQ = [
  {
    "q": "What is HIVnext?",
    "a": "HIVnext is Malaysia's unified Health Information Vault for Differentiated HIV Services — a cloud-based platform replacing Google Workspace setup across 50+ sites implemented by 21 NGOs."
  },
  {
    "q": "Who can use HIVnext?",
    "a": "HIVnext is designed for Program Managers/Coordinators (PM/PC), Community Health Workers (CHWs), Community Health Navigators (CHNs), Peer Educators (PE), MAF/MAC Admins & Digital Team, MOH staffs, Supervisors and other related bodies."
  },
  {
    "q": "How do I access HIVnext?",
    "a": "The main HIVnext platform is currently in beta. For access, contact hivnext@myaids.org.my. Legacy data is available through the HIVnext Legacy portal."
  },
  {
    "q": "What is the difference between HIVnext and Legacy?",
    "a": "HIVnext is the new, custom-tailored cloud database management system. HIVnext Legacy is the archive of previous DHSKP from 2024 until 2026 and TestNow data stored in Google Workspace."
  },
  {
    "q": "Is my data secure in HIVnext?",
    "a": "Yes. HIVnext uses RBAC + ABAC (Role-Based and Attribute-Based Access Control) ensuring users only see data relevant to their role and site."
  }
];
