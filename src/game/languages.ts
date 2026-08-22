import type { HintMode, LangCategory } from "../shared";

export type LangDef = {
	id: string;
	name: string; // English display name
	native: string; // endonym
	flag: string;
	country: string;
	group: string; // relatedness group — same group = "closely related"
	category: LangCategory;
	code?: string; // translation API code
};

// ---------------------------------------------------------------------------
// Modern languages (~105)
// ---------------------------------------------------------------------------

const MODERN: LangDef[] = [
	{ id: "es", name: "Spanish", native: "Español", flag: "🇪🇸", country: "Spain", group: "romance", category: "modern", code: "es" },
	{ id: "fr", name: "French", native: "Français", flag: "🇫🇷", country: "France", group: "romance", category: "modern", code: "fr" },
	{ id: "it", name: "Italian", native: "Italiano", flag: "🇮🇹", country: "Italy", group: "romance", category: "modern", code: "it" },
	{ id: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹", country: "Portugal", group: "romance", category: "modern", code: "pt" },
	{ id: "ro", name: "Romanian", native: "Română", flag: "🇷🇴", country: "Romania", group: "romance", category: "modern", code: "ro" },
	{ id: "ca", name: "Catalan", native: "Català", flag: "🇦🇩", country: "Andorra", group: "romance", category: "modern", code: "ca" },
	{ id: "gl", name: "Galician", native: "Galego", flag: "🇪🇸", country: "Spain", group: "romance", category: "modern", code: "gl" },
	{ id: "ht", name: "Haitian Creole", native: "Kreyòl Ayisyen", flag: "🇭🇹", country: "Haiti", group: "creole", category: "modern", code: "ht" },
	{ id: "de", name: "German", native: "Deutsch", flag: "🇩🇪", country: "Germany", group: "gm-west", category: "modern", code: "de" },
	{ id: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱", country: "Netherlands", group: "gm-west", category: "modern", code: "nl" },
	{ id: "af", name: "Afrikaans", native: "Afrikaans", flag: "🇿🇦", country: "South Africa", group: "gm-west", category: "modern", code: "af" },
	{ id: "lb", name: "Luxembourgish", native: "Lëtzebuergesch", flag: "🇱🇺", country: "Luxembourg", group: "gm-west", category: "modern", code: "lb" },
	{ id: "fy", name: "Frisian", native: "Frysk", flag: "🇳🇱", country: "Netherlands", group: "gm-west", category: "modern", code: "fy" },
	{ id: "yi", name: "Yiddish", native: "ייִדיש", flag: "✡️", country: "Ashkenazi diaspora", group: "gm-west", category: "modern", code: "yi" },
	{ id: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪", country: "Sweden", group: "gm-north", category: "modern", code: "sv" },
	{ id: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴", country: "Norway", group: "gm-north", category: "modern", code: "no" },
	{ id: "da", name: "Danish", native: "Dansk", flag: "🇩🇰", country: "Denmark", group: "gm-north", category: "modern", code: "da" },
	{ id: "is", name: "Icelandic", native: "Íslenska", flag: "🇮🇸", country: "Iceland", group: "gm-north", category: "modern", code: "is" },
	{ id: "fo", name: "Faroese", native: "Føroyskt", flag: "🇫🇴", country: "Faroe Islands", group: "gm-north", category: "modern", code: "fo" },
	{ id: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮", country: "Finland", group: "uralic", category: "modern", code: "fi" },
	{ id: "hu", name: "Hungarian", native: "Magyar", flag: "🇭🇺", country: "Hungary", group: "uralic", category: "modern", code: "hu" },
	{ id: "et", name: "Estonian", native: "Eesti", flag: "🇪🇪", country: "Estonia", group: "uralic", category: "modern", code: "et" },
	{ id: "pl", name: "Polish", native: "Polski", flag: "🇵🇱", country: "Poland", group: "slv-west", category: "modern", code: "pl" },
	{ id: "cs", name: "Czech", native: "Čeština", flag: "🇨🇿", country: "Czechia", group: "slv-west", category: "modern", code: "cs" },
	{ id: "sk", name: "Slovak", native: "Slovenčina", flag: "🇸🇰", country: "Slovakia", group: "slv-west", category: "modern", code: "sk" },
	{ id: "ru", name: "Russian", native: "Русский", flag: "🇷🇺", country: "Russia", group: "slv-east", category: "modern", code: "ru" },
	{ id: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦", country: "Ukraine", group: "slv-east", category: "modern", code: "uk" },
	{ id: "be", name: "Belarusian", native: "Беларуская", flag: "🇧🇾", country: "Belarus", group: "slv-east", category: "modern", code: "be" },
	{ id: "bg", name: "Bulgarian", native: "Български", flag: "🇧🇬", country: "Bulgaria", group: "slv-south", category: "modern", code: "bg" },
	{ id: "sr", name: "Serbian", native: "Српски", flag: "🇷🇸", country: "Serbia", group: "slv-south", category: "modern", code: "sr" },
	{ id: "hr", name: "Croatian", native: "Hrvatski", flag: "🇭🇷", country: "Croatia", group: "slv-south", category: "modern", code: "hr" },
	{ id: "bs", name: "Bosnian", native: "Bosanski", flag: "🇧🇦", country: "Bosnia", group: "slv-south", category: "modern", code: "bs" },
	{ id: "sl", name: "Slovenian", native: "Slovenščina", flag: "🇸🇮", country: "Slovenia", group: "slv-south", category: "modern", code: "sl" },
	{ id: "mk", name: "Macedonian", native: "Македонски", flag: "🇲🇰", country: "North Macedonia", group: "slv-south", category: "modern", code: "mk" },
	{ id: "lv", name: "Latvian", native: "Latviešu", flag: "🇱🇻", country: "Latvia", group: "baltic", category: "modern", code: "lv" },
	{ id: "lt", name: "Lithuanian", native: "Lietuvių", flag: "🇱🇹", country: "Lithuania", group: "baltic", category: "modern", code: "lt" },
	{ id: "ga", name: "Irish", native: "Gaeilge", flag: "🇮🇪", country: "Ireland", group: "celtic", category: "modern", code: "ga" },
	{ id: "cy", name: "Welsh", native: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", country: "Wales", group: "celtic", category: "modern", code: "cy" },
	{ id: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷", country: "Greece", group: "hellenic", category: "modern", code: "el" },
	{ id: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷", country: "Türkiye", group: "turkic", category: "modern", code: "tr" },
	{ id: "az", name: "Azerbaijani", native: "Azərbaycan", flag: "🇦🇿", country: "Azerbaijan", group: "turkic", category: "modern", code: "az" },
	{ id: "uz", name: "Uzbek", native: "Oʻzbek", flag: "🇺🇿", country: "Uzbekistan", group: "turkic", category: "modern", code: "uz" },
	{ id: "kk", name: "Kazakh", native: "Қазақ", flag: "🇰🇿", country: "Kazakhstan", group: "turkic", category: "modern", code: "kk" },
	{ id: "ar", name: "Arabic", native: "العربية", flag: "🇪🇬", country: "Egypt", group: "semitic", category: "modern", code: "ar" },
	{ id: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱", country: "Israel", group: "semitic", category: "modern", code: "he" },
	{ id: "am", name: "Amharic", native: "አማርኛ", flag: "🇪🇹", country: "Ethiopia", group: "semitic", category: "modern", code: "am" },
	{ id: "ti", name: "Tigrinya", native: "ትግርኛ", flag: "🇪🇷", country: "Eritrea", group: "semitic", category: "modern", code: "ti" },
	{ id: "mt", name: "Maltese", native: "Malti", flag: "🇲🇹", country: "Malta", group: "semitic", category: "modern", code: "mt" },
	{ id: "fa", name: "Persian", native: "فارسی", flag: "🇮🇷", country: "Iran", group: "iranian", category: "modern", code: "fa" },
	{ id: "ku", name: "Kurdish", native: "کوردی", flag: "🇮🇶", country: "Iraq", group: "iranian", category: "modern", code: "ku" },
	{ id: "ps", name: "Pashto", native: "پښتو", flag: "🇦🇫", country: "Afghanistan", group: "iranian", category: "modern", code: "ps" },
	{ id: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "hi" },
	{ id: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩", country: "Bangladesh", group: "indo-aryan", category: "modern", code: "bn" },
	{ id: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰", country: "Pakistan", group: "indo-aryan", category: "modern", code: "ur" },
	{ id: "ne", name: "Nepali", native: "नेपाली", flag: "🇳🇵", country: "Nepal", group: "indo-aryan", category: "modern", code: "ne" },
	{ id: "si", name: "Sinhala", native: "සිංහල", flag: "🇱🇰", country: "Sri Lanka", group: "indo-aryan", category: "modern", code: "si" },
	{ id: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "pa" },
	{ id: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "gu" },
	{ id: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "mr" },
	{ id: "or", name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "or" },
	{ id: "as", name: "Assamese", native: "অসমীয়া", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "as" },
	{ id: "sd", name: "Sindhi", native: "سنڌي", flag: "🇵🇰", country: "Pakistan", group: "indo-aryan", category: "modern", code: "sd" },
	{ id: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳", country: "India", group: "dravidian", category: "modern", code: "ta" },
	{ id: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳", country: "India", group: "dravidian", category: "modern", code: "te" },
	{ id: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳", country: "India", group: "dravidian", category: "modern", code: "kn" },
	{ id: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳", country: "India", group: "dravidian", category: "modern", code: "ml" },
	{ id: "th", name: "Thai", native: "ไทย", flag: "🇹🇭", country: "Thailand", group: "tai", category: "modern", code: "th" },
	{ id: "lo", name: "Lao", native: "ລາວ", flag: "🇱🇦", country: "Laos", group: "tai", category: "modern", code: "lo" },
	{ id: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳", country: "Vietnam", group: "austroasiatic", category: "modern", code: "vi" },
	{ id: "km", name: "Khmer", native: "ខ្មែរ", flag: "🇰🇭", country: "Cambodia", group: "austroasiatic", category: "modern", code: "km" },
	{ id: "my", name: "Burmese", native: "ဗမာ", flag: "🇲🇲", country: "Myanmar", group: "tibeto-burman", category: "modern", code: "my" },
	{ id: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩", country: "Indonesia", group: "austronesian", category: "modern", code: "id" },
	{ id: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾", country: "Malaysia", group: "austronesian", category: "modern", code: "ms" },
	{ id: "tl", name: "Filipino", native: "Filipino", flag: "🇵🇭", country: "Philippines", group: "austronesian", category: "modern", code: "tl" },
	{ id: "ceb", name: "Cebuano", native: "Sinugbuanon", flag: "🇵🇭", country: "Philippines", group: "austronesian", category: "modern", code: "ceb" },
	{ id: "jv", name: "Javanese", native: "Basa Jawa", flag: "🇮🇩", country: "Indonesia", group: "austronesian", category: "modern", code: "jv" },
	{ id: "su", name: "Sundanese", native: "Basa Sunda", flag: "🇮🇩", country: "Indonesia", group: "austronesian", category: "modern", code: "su" },
	{ id: "mg", name: "Malagasy", native: "Malagasy", flag: "🇲🇬", country: "Madagascar", group: "austronesian", category: "modern", code: "mg" },
	{ id: "mi", name: "Maori", native: "Te Reo Māori", flag: "🇳🇿", country: "New Zealand", group: "austronesian", category: "modern", code: "mi" },
	{ id: "sm", name: "Samoan", native: "Gagana Samoa", flag: "🇼🇸", country: "Samoa", group: "austronesian", category: "modern", code: "sm" },
	{ id: "to", name: "Tongan", native: "Lea Faka-Tonga", flag: "🇹🇴", country: "Tonga", group: "austronesian", category: "modern", code: "to" },
	{ id: "fj", name: "Fijian", native: "Na Vosa Vakaviti", flag: "🇫🇯", country: "Fiji", group: "austronesian", category: "modern", code: "fj" },
	{ id: "haw", name: "Hawaiian", native: "ʻŌlelo Hawaiʻi", flag: "🌺", country: "Hawaii", group: "austronesian", category: "modern", code: "haw" },
	{ id: "zh", name: "Chinese", native: "中文", flag: "🇨🇳", country: "China", group: "sinitic", category: "modern", code: "zh-CN" },
	{ id: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵", country: "Japan", group: "japonic", category: "modern", code: "ja" },
	{ id: "ko", name: "Korean", native: "한국어", flag: "🇰🇷", country: "South Korea", group: "koreanic", category: "modern", code: "ko" },
	{ id: "mn", name: "Mongolian", native: "Монгол", flag: "🇲🇳", country: "Mongolia", group: "mongolic", category: "modern", code: "mn" },
	{ id: "ka", name: "Georgian", native: "ქართული", flag: "🇬🇪", country: "Georgia", group: "kartvelian", category: "modern", code: "ka" },
	{ id: "hy", name: "Armenian", native: "Հայերեն", flag: "🇦🇲", country: "Armenia", group: "armenian", category: "modern", code: "hy" },
	{ id: "sq", name: "Albanian", native: "Shqip", flag: "🇦🇱", country: "Albania", group: "albanian", category: "modern", code: "sq" },
	{ id: "sw", name: "Swahili", native: "Kiswahili", flag: "🇰🇪", country: "Kenya", group: "bantu", category: "modern", code: "sw" },
	{ id: "zu", name: "Zulu", native: "isiZulu", flag: "🇿🇦", country: "South Africa", group: "bantu", category: "modern", code: "zu" },
	{ id: "xh", name: "Xhosa", native: "isiXhosa", flag: "🇿🇦", country: "South Africa", group: "bantu", category: "modern", code: "xh" },
	{ id: "st", name: "Sesotho", native: "Sesotho", flag: "🇱🇸", country: "Lesotho", group: "bantu", category: "modern", code: "st" },
	{ id: "sn", name: "Shona", native: "ChiShona", flag: "🇿🇼", country: "Zimbabwe", group: "bantu", category: "modern", code: "sn" },
	{ id: "ha", name: "Hausa", native: "Hausa", flag: "🇳🇬", country: "Nigeria", group: "chadic", category: "modern", code: "ha" },
	{ id: "yo", name: "Yoruba", native: "Yorùbá", flag: "🇳🇬", country: "Nigeria", group: "yoruboid", category: "modern", code: "yo" },
	{ id: "ig", name: "Igbo", native: "Igbo", flag: "🇳🇬", country: "Nigeria", group: "igbo", category: "modern", code: "ig" },
	{ id: "so", name: "Somali", native: "Soomaali", flag: "🇸🇴", country: "Somalia", group: "cushitic", category: "modern", code: "so" },
	{ id: "qu", name: "Quechua", native: "Runasimi", flag: "🇵🇪", country: "Peru", group: "quechua", category: "modern", code: "qu" },
	{ id: "ay", name: "Aymara", native: "Aymar aru", flag: "🇧🇴", country: "Bolivia", group: "aymaran", category: "modern", code: "ay" },
	{ id: "gn", name: "Guarani", native: "Avañe'ẽ", flag: "🇵🇾", country: "Paraguay", group: "tupi", category: "modern", code: "gn" },
	{ id: "kl", name: "Greenlandic", native: "Kalaallisut", flag: "🇬🇱", country: "Greenland", group: "eskimo", category: "modern", code: "kl" },
	{ id: "eo", name: "Esperanto", native: "Esperanto", flag: "🌐", country: "Constructed", group: "constructed", category: "modern", code: "eo" },
	{ id: "co", name: "Corsican", native: "Corsu", flag: "🇫🇷", country: "Corsica", group: "romance", category: "modern", code: "co" },
	{ id: "sc", name: "Sardinian", native: "Sardu", flag: "🇮🇹", country: "Sardinia", group: "romance", category: "modern", code: "sc" },
	{ id: "rm", name: "Romansh", native: "Rumantsch", flag: "🇨🇭", country: "Switzerland", group: "romance", category: "modern", code: "rm" },
	{ id: "gd", name: "Scottish Gaelic", native: "Gàidhlig", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", country: "Scotland", group: "celtic", category: "modern", code: "gd" },
	{ id: "br", name: "Breton", native: "Brezhoneg", flag: "🇫🇷", country: "Brittany", group: "celtic", category: "modern", code: "br" },
	{ id: "ky", name: "Kyrgyz", native: "Кыргызча", flag: "🇰🇬", country: "Kyrgyzstan", group: "turkic", category: "modern", code: "ky" },
	{ id: "tk", name: "Turkmen", native: "Türkmençe", flag: "🇹🇲", country: "Turkmenistan", group: "turkic", category: "modern", code: "tk" },
	{ id: "ug", name: "Uyghur", native: "ئۇيغۇرچە", flag: "🏜️", country: "Xinjiang", group: "turkic", category: "modern", code: "ug" },
	{ id: "tt", name: "Tatar", native: "Татарча", flag: "🕌", country: "Tatarstan", group: "turkic", category: "modern", code: "tt" },
	{ id: "ba", name: "Bashkir", native: "Башҡортса", flag: "🐎", country: "Bashkortostan", group: "turkic", category: "modern", code: "ba" },
	{ id: "cv", name: "Chuvash", native: "Чӑвашла", flag: "🌾", country: "Chuvashia", group: "turkic", category: "modern", code: "cv" },
	{ id: "tg", name: "Tajik", native: "Тоҷикӣ", flag: "🇹🇯", country: "Tajikistan", group: "iranian", category: "modern", code: "tg" },
	{ id: "yue", name: "Cantonese", native: "廣東話", flag: "🇭🇰", country: "Hong Kong", group: "sinitic", category: "modern", code: "yue" },
	{ id: "bo", name: "Tibetan", native: "བོད་སྐད་", flag: "🏔️", country: "Tibet", group: "tibeto-burman", category: "modern", code: "bo" },
	{ id: "dz", name: "Dzongkha", native: "རྫོང་ཁ", flag: "🇧🇹", country: "Bhutan", group: "tibeto-burman", category: "modern", code: "dz" },
	{ id: "dv", name: "Dhivehi", native: "ދިވެހި", flag: "🇲🇻", country: "Maldives", group: "indo-aryan", category: "modern", code: "dv" },
	{ id: "mai", name: "Maithili", native: "मैथिली", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "mai" },
	{ id: "bho", name: "Bhojpuri", native: "भोजपुरी", flag: "🇮🇳", country: "India", group: "indo-aryan", category: "modern", code: "bho" },
	{ id: "rw", name: "Kinyarwanda", native: "Ikinyarwanda", flag: "🇷🇼", country: "Rwanda", group: "bantu", category: "modern", code: "rw" },
	{ id: "lg", name: "Luganda", native: "Luganda", flag: "🇺🇬", country: "Uganda", group: "bantu", category: "modern", code: "lg" },
	{ id: "ny", name: "Chichewa", native: "Chichewa", flag: "🇲🇼", country: "Malawi", group: "bantu", category: "modern", code: "ny" },
	{ id: "om", name: "Oromo", native: "Oromoo", flag: "🇪🇹", country: "Ethiopia", group: "cushitic", category: "modern", code: "om" },
	{ id: "ak", name: "Akan", native: "Akan", flag: "🇬🇭", country: "Ghana", group: "akan", category: "modern", code: "ak" },
	{ id: "ts", name: "Tsonga", native: "Xitsonga", flag: "🇿🇦", country: "South Africa", group: "bantu", category: "modern", code: "ts" },
	{ id: "tn", name: "Tswana", native: "Setswana", flag: "🇧🇼", country: "Botswana", group: "bantu", category: "modern", code: "tn" },
	{ id: "ilo", name: "Ilocano", native: "Ilokano", flag: "🇵🇭", country: "Philippines", group: "austronesian", category: "modern", code: "ilo" },
	{ id: "ban", name: "Balinese", native: "Basa Bali", flag: "🇮🇩", country: "Indonesia", group: "austronesian", category: "modern", code: "ban" },
];

// ---------------------------------------------------------------------------
// Ancient languages (phrasebooks used when live translation isn't possible)
// ---------------------------------------------------------------------------

const ANCIENT: LangDef[] = [
	{ id: "la", name: "Latin", native: "Lingua Latina", flag: "🏛️", country: "Roman Empire", group: "romance-ancient", category: "ancient", code: "la" },
	{ id: "sa", name: "Sanskrit", native: "संस्कृतम्", flag: "🕉️", country: "Ancient India", group: "indo-aryan-ancient", category: "ancient", code: "sa" },
	{ id: "grc", name: "Ancient Greek", native: "Ἑλληνική", flag: "🏺", country: "Ancient Greece", group: "hellenic-ancient", category: "ancient" },
	{ id: "non", name: "Old Norse", native: "Dǫnsk tunga", flag: "⚔️", country: "Viking Age Scandinavia", group: "gm-north-ancient", category: "ancient" },
	{ id: "ang", name: "Old English", native: "Ænglisc", flag: "📜", country: "Anglo-Saxon England", group: "gm-west-ancient", category: "ancient" },
	{ id: "hbo", name: "Biblical Hebrew", native: "לשון הקודש", flag: "🕎", country: "Ancient Israel", group: "semitic-ancient", category: "ancient" },
	{ id: "egy", name: "Ancient Egyptian", native: "r n km.t", flag: "🐫", country: "Ancient Egypt", group: "egyptian", category: "ancient" },
];

export type Phrase = { en: string; text: string };

export const PHRASEBOOKS: Record<string, Phrase[]> = {
	la: [
		{ en: "The sun is bright today.", text: "Sol hodie clarus est." },
		{ en: "I drink water every morning.", text: "Aquam mane cotidie bibo." },
		{ en: "My friend lives in a big house.", text: "Amicus meus in magna domo habitat." },
		{ en: "We walk to the market together.", text: "Una ad forum ambulamus." },
		{ en: "The children play in the garden.", text: "Liberi in horto ludunt." },
		{ en: "Winter is colder than autumn.", text: "Hiems frigidior autumno est." },
	],
	sa: [
		{ en: "My friend comes to my house.", text: "Mitraṁ mama gṛhaṁ āgacchati." },
		{ en: "I eat fruit every day.", text: "Ahaṁ phalāni khādāmi." },
		{ en: "The teacher speaks the lesson.", text: "Guruḥ pāṭhaṁ vadati." },
		{ en: "We play in the garden.", text: "Vayaṁ udyāne krīḍāmaḥ." },
		{ en: "The water is cold.", text: "Jalaṁ śītalam asti." },
		{ en: "The sun is beautiful today.", text: "Sūryaḥ śobhanaḥ asti adya." },
	],
	grc: [
		{ en: "The sun is bright today.", text: "Ὁ ἥλιος σήμερον λαμπρός ἐστιν." },
		{ en: "The water is cold.", text: "Τὸ ὕδωρ ψυχρόν ἐστιν." },
		{ en: "My friend lives in a big house.", text: "Ὁ φίλος μου ἐν μεγάλῃ οἰκίᾳ οἰκεῖ." },
		{ en: "The children play in the garden.", text: "Οἱ παῖδες ἐν τῷ κήπῳ παίζουσιν." },
		{ en: "I buy bread and cheese.", text: "Ἄρτον καὶ τυρὸν ἀγοράζω." },
		{ en: "The teacher writes the letter.", text: "Ὁ διδάσκαλος τὴν ἐπιστολὴν γράφει." },
	],
	non: [
		{ en: "The sun shines today.", text: "Sólin skín í dag." },
		{ en: "The sea is cold.", text: "Sjórinn er kaldr." },
		{ en: "The man lives in a big house.", text: "Maðrinn býr í stórum húsi." },
		{ en: "We walk to the market.", text: "Við gangum til markaðar." },
		{ en: "The children play in the garden.", text: "Börnin leika sér í garðinum." },
		{ en: "Winter is colder than autumn.", text: "Vetrinn er kaldari en haustinn." },
	],
	ang: [
		{ en: "The sun shines today.", text: "Sēo sunne scīnt tōdæg." },
		{ en: "I drink water every day.", text: "Ic drince wæter ælce dæg." },
		{ en: "My friend lives in a big house.", text: "Mīn frēond wunaþ on miclum hūse." },
		{ en: "We walk to the market together.", text: "Wē gāþ tō ceapiunge samod." },
		{ en: "The children play in the yard.", text: "Þā cild pleagaþ on þǣm geardæ." },
		{ en: "Winter is colder than autumn.", text: "Winter is cealdor þonne hærfest." },
	],
	hbo: [
		{ en: "The sun rose today.", text: "הַשֶּׁמֶשׁ זָרְחָה הַיּוֹם" },
		{ en: "I drink water every morning.", text: "אֲנִי שׁוֹתֶה מַיִם בְּכָל בֹּקֶר" },
		{ en: "My friend sits in a big house.", text: "רֵעִי יוֹשֵׁב בְּבַיִת גָּדוֹל" },
		{ en: "The water is very cold.", text: "הַמַּיִם קָרִים מְאֹד" },
		{ en: "The children play in the garden.", text: "הַיְלָדִים מְשַׂחֲקִים בַּגַּן" },
		{ en: "Summer is hotter than winter.", text: "הַקַּיִץ חָם מֵהַחֹרֶף" },
	],
	egy: [
		{ en: "The sun is beautiful today.", text: "𓇳𓄤𓆑𓂋 𓆓𓏤𓇳𓏤" },
		{ en: "I drink water in the morning.", text: "𓇋𓈖𓆑 𓏇𓈖𓐍𓂋𓄿 𓆑𓈖𓐍𓏏" },
		{ en: "The scribe writes with a reed pen.", text: "𓏞𓊃𓏏𓈖𓂋𓏤 𓌸𓂋𓏛𓏤" },
		{ en: "The house is big and strong.", text: "𓉐𓏤𓆎𓅱𓊖𓏥 𓄔𓈖𓇳" },
		{ en: "Life, prosperity and health!", text: "𓋹𓍑𓋴 𓆓𓏏𓇳" },
		{ en: "The river flows to the sea.", text: "𓇋𓏏𓂋𓅱 𓆓𓈖𓇟𓆎𓅓𓊖" },
	],
};

export const ALL_LANGS: LangDef[] = [...MODERN, ...ANCIENT];

// ---------------------------------------------------------------------------
// Fake languages (only in Super Hard mode — procedurally generated gibberish)
// ---------------------------------------------------------------------------

export type FakeLangDef = LangDef & {
	syllables: string[];
	endings: string[];
};

const FAKE: FakeLangDef[] = [
	{
		id: "velmoran", name: "Velmoran", native: "Velmoreth", flag: "🪐", country: "Velmora Prime",
		group: "fake-velmar", category: "fake",
		syllables: ["vel", "ora", "miel", "tha", "lun", "ser", "avi", "elo"],
		endings: ["ra", "nie", "los", "tha", "mir", "en"],
	},
	{
		id: "kavanni", name: "Kavanni", native: "Kavannia", flag: "🦋", country: "Kavath Isle",
		group: "fake-velmar", category: "fake",
		syllables: ["ka", "van", "ni", "sol", "te", "mar", "ilu", "ren"],
		endings: ["ni", "ka", "sel", "ta", "vin", "lo"],
	},
	{
		id: "mirreni", name: "Mirreni", native: "Mirrenil", flag: "🌙", country: "Mirren Delta",
		group: "fake-velmar", category: "fake",
		syllables: ["mi", "rre", "na", "sel", "vi", "lo", "the", "enna"],
		endings: ["ni", "ssa", "rel", "mo", "ne", "li"],
	},
	{
		id: "zuthric", name: "Zuthric", native: "Zuthrik", flag: "⚙️", country: "Zuthkar Republic",
		group: "fake-zuth", category: "fake",
		syllables: ["zuth", "rak", "vo", "grim", "kesh", "dro", "ul", "mak"],
		endings: ["ik", "or", "ath", "ek", "uz", "rim"],
	},
	{
		id: "brakthar", name: "Brak'thar", native: "Brak'thari", flag: "🔥", country: "Brak'thar Wastes",
		group: "fake-zuth", category: "fake",
		syllables: ["brak", "thu", "gar", "zim", "rok", "ash", "dul", "kor"],
		endings: ["'tar", "akh", "ug", "rim", "oth", "zak"],
	},
	{
		id: "ondulese", name: "Ondulese", native: "Ondulès", flag: "🌊", country: "Ondu Atoll",
		group: "fake-ondu", category: "fake",
		syllables: ["on", "du", "le", "mar", "so", "ti", "ela", "nu"],
		endings: ["se", "lo", "re", "nth", "da", "is"],
	},
	{
		id: "yeshari", name: "Yeshari", native: "Yesharin", flag: "👁️", country: "Yeshar Steppe",
		group: "fake-yesh", category: "fake",
		syllables: ["ye", "sha", "ri", "ko", "nam", "ta", "su", "ren"],
		endings: ["ari", "esh", "un", "ka", "ir", "osh"],
	},
	{
		id: "quovax", name: "Quovax", native: "Quovaxi", flag: "🐉", country: "Quovax Basin",
		group: "fake-quov", category: "fake",
		syllables: ["quo", "vax", "zi", "mor", "peb", "lu", "kaw", "ex"],
		endings: ["ax", "ix", "ox", "eth", "ux", "ar"],
	},
];

function hashStr(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function fakeTranslate(langId: string, sentence: string): string {
	const def = FAKE.find((l) => l.id === langId);
	if (!def) return sentence;
	return sentence
		.split(/(\s+)/)
		.map((part) => {
			if (/^\s+$/.test(part)) return part;
			const m = part.match(/^(\W*)(.*?)(\W*)$/s);
			if (!m || !m[2]) return part;
			const [, pre, core, post] = m;
			const h = hashStr(def.id + ":" + core.toLowerCase());
			const sylCount = core.length <= 3 ? 2 : ((h >>> 3) % 2) + 2;
			let w = "";
			for (let i = 0; i < sylCount; i++) {
				w += def.syllables[(h >>> (i * 4)) % def.syllables.length];
			}
			w += def.endings[(h >>> 9) % def.endings.length];
			if (/^[A-Z]/.test(core)) w = w.charAt(0).toUpperCase() + w.slice(1);
			return pre + w + post;
		})
		.join("");
}

const LANG_MAP = new Map(ALL_LANGS.map((l) => [l.id, l]));

export function langById(id: string): LangDef | undefined {
	return LANG_MAP.get(id);
}

export function groupOf(id: string): string | undefined {
	return LANG_MAP.get(id)?.group;
}

// ---------------------------------------------------------------------------
// Live translation (Google gtx endpoint, MyMemory fallback) with caching
// ---------------------------------------------------------------------------

const translationCache = new Map<string, string>();

async function fetchJson(url: string): Promise<unknown> {
	const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

export async function translateText(text: string, targetCode: string): Promise<string | null> {
	const key = `${targetCode}:${text}`;
	const cached = translationCache.get(key);
	if (cached !== undefined) return cached;

	// Primary: Google translate gtx endpoint
	try {
		const url =
			`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(text)}`;
		const data = (await fetchJson(url)) as [[[string, string]]];
		const joined = data?.[0]?.map((seg) => seg?.[0] ?? "").join("") ?? "";
		if (joined.trim()) {
			translationCache.set(key, joined);
			return joined;
		}
	} catch {
		/* fall through */
	}

	// Fallback: MyMemory
	try {
		const url =
			`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(targetCode)}`;
		const data = (await fetchJson(url)) as { responseData?: { translatedText?: string } };
		const t = data?.responseData?.translatedText;
		if (typeof t === "string" && t.trim() && !t.includes("MYMEMORY WARNING") && !t.includes("QUERY LENGTH LIMIT")) {
			translationCache.set(key, t);
			return t;
		}
	} catch {
		/* fall through */
	}

	return null;
}

// ---------------------------------------------------------------------------
// Hint masking — whole words only (never partial letters)
// ---------------------------------------------------------------------------

export function obfuscate(text: string, mode: HintMode): string {
	if (mode === "full") return text;
	const showEvery = mode === "some" ? 3 : 6; // some → ~1/3 visible, most → ~1/6
	let wordCount = 0;
	return text
		.split(/(\s+)/)
		.map((part) => {
			if (!part || /^\s+$/.test(part)) return part;
			wordCount++;
			if (wordCount % showEvery === 0) return part;
			return "_".repeat([...part].length);
		})
		.join("");
}
