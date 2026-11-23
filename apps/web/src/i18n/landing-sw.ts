/**
 * apps/web/src/i18n/landing-sw.ts
 * Kiswahili ya ukurasa wa kwanza. Maneno ya kawaida, si tafsiri ngumu.
 */
import type { landingEn } from "./landing-en";

export const landingSw: typeof landingEn = {
  skip: "Ruka kwenda kwenye maudhui",
  menu: "Menyu",
  openMenu: "Fungua menyu",
  closeMenu: "Funga menyu",
  nav: {
    about: "Kuhusu",
    howItWorks: "Jinsi inavyofanya kazi",
    why: "Kwa nini OrderVerify",
    faq: "Maswali",
    startVerifying: "Anza kukagua",
  },
  hero: {
    seeHow: "Ona jinsi inavyofanya kazi",
    prev: "Slaidi iliyotangulia",
    next: "Slaidi inayofuata",
    play: "Cheza slaidi",
    pause: "Simamisha slaidi",
    slideOf: "Slaidi",
    of: "kati ya",
    autoplaying: "Inacheza yenyewe.",
    showSlide: "Onyesha slaidi",
    slides: {
      clothing: {
        headline: "Thibitisha malipo. Kisha tuma bidhaa.",
        description: "Linganisha malipo ya M-Pesa na oda zako kabla ya kuzituma.",
        alt: "Wachuuzi wa nguo mbele ya reli ya mavazi dukani.",
      },
      beauty: {
        headline: "Linda kila oda kabla haijatoka.",
        description: "Tumia muda mdogo kulinganisha malipo kwa mkono, na uongeze biashara yako.",
        alt: "Mjasiriamali wa urembo akiwa na bidhaa za ngozi kutoka kwenye katalogi yake.",
      },
      social: {
        headline: "Oda zako zinastahili ukaguzi wa pili.",
        description: "Ukaguzi wa malipo wa bei nafuu, kwa namna unavyouza mtandaoni.",
        alt: "Mchuuzi wa mitandao akiandika maudhui ya bidhaa kwa mwanga wa pete.",
      },
    },
  },
  benefits: {
    heading: "Faida za kulipa kwa kundi",
    items: [
      { title: "Lipa kwa kundi.", description: "Hakuna ada kubwa ya kila mwezi." },
      { title: "Imejengwa kwa M-Pesa.", description: "Imeundwa kwa namna wachuuzi wanavyopokea malipo." },
      { title: "Kagua kabla ya kutuma.", description: "Fanya maamuzi bora kabla bidhaa hazijatoka." },
    ],
  },
  about: {
    eyebrow: "Kuhusu OrderVerify",
    title: "Njia bora ya kukagua malipo ya M-Pesa.",
    description:
      "OrderVerify inawasaidia wachuuzi wa mtandaoni kuona kama malipo ya mteja yanalingana na oda kabla ya kutuma bidhaa.",
    points: [
      "Zuia uthibitisho wa malipo bandia.",
      "Epuka makosa yanayogharimu.",
      "Kudumisha biashara yako kwa uhakika.",
    ],
    collageLabel: "Wachuuzi wa nguo, urembo, na biashara ya mitandao",
    alts: {
      clothing: "Duka la nguo lenye nguo zenye rangi kwenye maonyesho.",
      beauty: "Chupa za urembo na bidhaa za spa kwenye trei ya mbao.",
      orders: "Mchuuzi akiangalia oda kwenye simu huku akifanya kazi kwenye kompyuta.",
    },
  },
  how: {
    eyebrow: "Jinsi inavyofanya kazi",
    title: "Jinsi OrderVerify inavyofanya kazi",
    description: "Hatua nne rahisi kukagua malipo kabla ya kutuma bidhaa.",
    steps: [
      {
        title: "Pakia oda na ushahidi wa malipo",
        description: "Pakia taarifa za oda na ushahidi wa malipo ya M-Pesa ulionao.",
      },
      {
        title: "Lipa kwa kundi",
        description: "Lipa 0.01 USDC kwa kila kundi la ukaguzi kupitia Stellar x402.",
      },
      {
        title: "Kagua maelezo ya malipo",
        description: "Maelezo ya malipo yaliyopo yanalinganishwa na oda ulizowasilisha.",
      },
      {
        title: "Soma ripoti",
        description: "Ona oda zipi zatumwa, zipi zinahitaji kuangaliwa, na zipi zimesimamishwa.",
      },
    ],
  },
  reportPreview: {
    eyebrow: "Ripoti za oda",
    title: "Jua oda zipi zatuma, zipi uangalie, na zipi usimishe.",
    description:
      "Pata ripoti wazi inayoonyesha oda zilizokaguliwa, zinazohitaji kuangaliwa, na zinazopaswa kusimamishwa — ili uepuke udanganyifu na kulinda bidhaa na pesa.",
    hint: "Ujumbe unaotilia shaka peke yake si kila mara unatosha. Uthibitisho imara unahitaji taarifa ya M-Pesa au chanzo cha malipo kinachoaminika.",
    windowTitle: "Ripoti ya ukaguzi wa kundi",
    sample: "Mfano · oda 3",
    order: "Oda",
    payment: "Malipo",
    status: "Hali",
    reason: "Sababu",
    release: "Tuma",
    review: "Angalia",
    hold: "Simamisha",
    caption: "Oda za mfano na malipo, hali, na sababu",
    rows: [
      { reason: "Malipo yanalingana" },
      { reason: "Mtumaji wa kawaida kidogo" },
      { reason: "Inaweza kuwa nakala" },
    ],
  },
  why: {
    title: "Kwa nini OrderVerify",
    cards: [
      {
        title: "Ukaguzi wa bei nafuu.",
        description: "Lipa kwa kundi badala ya kulipa ada kubwa kila mwezi.",
      },
      {
        title: "Kazi ndogo kwa mkono.",
        description: "Punguza muda wa kulinganisha oda na ujumbe wa malipo.",
      },
      {
        title: "Gundua malipo yenye shaka.",
        description: "Tambua kodi zinazojirudia, kiasi kisicholingana, na maelezo ya malipo yasiyolingana.",
      },
      {
        title: "Maamuzi bora ya kutuma.",
        description: "Angalia oda zenye shaka kabla ya kutoa bidhaa.",
      },
      {
        title: "Wewe unasalia kudhibiti.",
        description: "Wewe unaamua nini kitatokea kwa oda zinazohitaji kuangaliwa.",
      },
    ],
  },
  cta: {
    title: "Linda kundi lako lijalo kabla halijatoka mikononi mwako.",
    body: "Kagua kila oda mara ya pili. Thibitisha malipo, angalia oda zenye shaka, na utume kwa uhakika zaidi.",
  },
  footer: {
    blurb: "Rahisi. Bei nafuu. Ya kuaminika. Kagua malipo. Kuza biashara yako.",
    quick: "Viungo vya haraka",
    start: "Anza",
    copyright: "© 2026 OrderVerify. Haki zote zimehifadhiwa.",
  },
  faqEval: {
    eyebrow: "Maswali na tathmini",
  },
};
