import { Room, SystemSettings } from '../types';

export const SYSTEM_INFO = {
  appName: 'TTC Smart Meeting Room Booking & Analytics Dashboard',
  orgName: 'วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
  departmentName: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
  shortName: 'TTC Meeting Room',
  tagline: 'ระบบจองห้องประชุมออนไลน์และวิเคราะห์ข้อมูลอัจฉริยะ',
};

// แผนกวิชาและหน่วยงานภายใน วท.ท่าหลวงซิเมนต์ไทยอนุสรณ์
export const DEPARTMENTS = [
  'ฝ่ายพัฒนาซอฟต์แวร์ (Dev & Tech)',
  'ฝ่ายออกแบบและผลิตภัณฑ์ (UI/UX & Product)',
  'ฝ่ายการตลาดและประชาสัมพันธ์ (Marketing)',
  'ฝ่ายขายและพัฒนาธุรกิจ (Sales & BD)',
  'ฝ่ายบุคคลและการเงิน (HR & Finance)',
  'ฝ่ายปฏิบัติการและการจัดการ (Operations)',
  'ทีมผู้บริหาร (Executive)',
  'อื่นๆ',
];

// รายการห้องประชุมดั้งเดิม
export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'Cyber Neon Horizon (ห้องใหญ่)',
    capacity: 20,
    floor: 4,
    description: 'ห้องประชุมใหญ่ วิวเมืองมุมกว้าง เหมาะสำหรับ Townhall, ระดมความคิด หรือประชุมทั้งแผนก',
    amenities: ['โปรเจกเตอร์ 4K', 'สมาร์ททีวี 75 นิ้ว', 'กล้อง & ไมค์วิดีโอคอนเฟอเรนซ์', 'กระดานไวท์บอร์ดอัจฉริยะ'],
    status: 'active',
    color: '#8B5CF6', // Violet
    imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    order: 1,
  },
  {
    id: 'room-2',
    name: 'Pink Cyberpunk (ห้องกลาง)',
    capacity: 10,
    floor: 3,
    description: 'ห้องประชุมขนาดกลาง บรรยากาศสดใส มีพลัง เหมาะสำหรับ Sprint Review & Workshop',
    amenities: ['สมาร์ททีวี', 'กล้อง & ไมค์วิดีโอคอนเฟอเรนซ์', 'กระดานไวท์บอร์ด'],
    status: 'active',
    color: '#EC4899', // Pink
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    order: 2,
  },
  {
    id: 'room-3',
    name: 'Cyan Future Lab (ห้องบรีฟงาน)',
    capacity: 6,
    floor: 3,
    description: 'ห้องประชุมกระจกโปร่ง สไตล์โมเดิร์น เหมาะสำหรับประชุมโปรเจกต์ย่อยและ Client Pitch',
    amenities: ['สมาร์ททีวี', 'กระดานไวท์บอร์ด'],
    status: 'active',
    color: '#06B6D4', // Cyan
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
    order: 3,
  },
  {
    id: 'room-4',
    name: 'Lime Creative Hub (ห้องระดมไอเดีย)',
    capacity: 8,
    floor: 2,
    description: 'ห้องเน้นความคิดสร้างสรรค์ มี Beanbags และ ไวท์บอร์ดรอบทิศทาง',
    amenities: ['สมาร์ททีวี', 'กล้อง & ไมค์วิดีโอคอนเฟอเรนซ์', 'กระดานไวท์บอร์ด'],
    status: 'active',
    color: '#84CC16', // Lime
    imageUrl: 'https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&w=800&q=80',
    order: 4,
  },
  {
    id: 'room-5',
    name: 'Sunset Pod (ห้องโฟกัส/1-on-1)',
    capacity: 4,
    floor: 2,
    description: 'ห้องเก็บเสียงส่วนตัว เหมาะสำหรับสัมภาษณ์งาน, 1-on-1 หรือโทรคุยกับต่างประเทศ',
    amenities: ['กล้อง & ไมค์วิดีโอคอนเฟอเรนซ์', 'กระดานไวท์บอร์ด'],
    status: 'active',
    color: '#F59E0B', // Amber
    imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    order: 5,
  },
];

export const AMENITIES_LIST = [
  { id: 'projector', label: 'โปรเจกเตอร์', icon: 'Projector' },
  { id: 'tv', label: 'สมาร์ททีวี', icon: 'Tv' },
  { id: 'videoconference', label: 'กล้อง & ไมค์วิดีโอคอนเฟอเรนซ์', icon: 'Video' },
  { id: 'whiteboard', label: 'กระดานไวท์บอร์ด', icon: 'PenTool' },
] as const;

// รายการครุภัณฑ์ 6 รายการตามข้อกำหนด
export const DEFAULT_EQUIPMENT = [
  { id: 'projector', key: 'projector', label: 'โปรเจกเตอร์' },
  { id: 'soundSystem', key: 'soundSystem', label: 'ระบบเสียง' },
  { id: 'microphone', key: 'microphone', label: 'ไมโครโฟน' },
  { id: 'extraTableChair', key: 'extraTableChair', label: 'โต๊ะ/เก้าอี้เสริม' },
  { id: 'customItem1', key: 'customItem1', label: 'อุปกรณ์เสริม 1' },
  { id: 'customItem2', key: 'customItem2', label: 'อุปกรณ์เสริม 2' },
] as const;

// การตั้งค่าระบบเริ่มต้น
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  systemTitle: 'TTC Smart Meeting Room Booking & Analytics Dashboard',
  organizationName: 'วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
  subDepartment: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',

  // สายอนุมัติ 4 ขั้น
  staffAudiovisual: {
    name: 'นายวัชรพงศ์ โสภา',
    position: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร (งานโสตทัศนูปกรณ์)',
    pin: '1111',
  },
  chiefDigital: {
    name: 'นายเอกราช เขียวทอง',
    position: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
    pin: '2222',
  },
  deputyDirector: {
    name: 'นายชาตรี เริงชัยภูมิ',
    position: 'รองผู้อำนวยการวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
    pin: '3333',
  },
  admin: {
    pin: '8888',
  },

  customEquipment1Label: 'โพเดียม / ป้ายข้อความ',
  customEquipment2Label: 'ปลั๊กพ่วง / จุดจ่ายไฟ',

  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  lineNotifyEnabled: false,
  lineNotifyToken: '',
  googleChatEnabled: false,
  googleChatWebhookUrl: '',
};

export const ADMIN_PIN = '8888';
