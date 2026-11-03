import { Room, SystemSettings } from '../types';

export const SYSTEM_INFO = {
  appName: 'TTC Smart Meeting Room Booking & Analytics Dashboard',
  orgName: 'วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
  departmentName: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
  shortName: 'TTC Meeting Room',
  tagline: 'ระบบจองห้องประชุมออนไลน์และวิเคราะห์ข้อมูลอัจฉริยะ',
};

// แผนกวิชาตามระเบียบวิทยาลัย
export const DEPARTMENTS = [
  'แผนกช่างไฟฟ้ากำลัง',
  'แผนกช่างอิเล็กทรอนิกส์',
  'แผนกช่างเทคนิคการผลิต',
  'แผนกช่างเทคนิคอุตสาหกรรม',
  'แผนกช่างซ่อมบำรุง',
  'แผนกช่างโลหะการ',
  'แผนกช่างยนต์',
  'แผนกวิชาบัญชี',
  'แผนกวิชาคอมพิวเตอร์ธุรกิจ',
  'แผนกวิชาการตลาด',
  'แผนกเทคโนโลยีสารสนเทศ',
  'แผนกเทคโนโลยีคอมพิวเตอร์',
  'แผนกเมคคาทรอนิกส์',
  'อื่นๆ (ระบุ)',
];

// รายการห้องประชุม 7 ห้อง (6 ห้องหลัก + อื่นๆ ระบุ)
export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'หอประชุมอดิเรกสาร',
    capacity: 0,
    floor: 1,
    description: 'หอประชุมใหญ่สำหรับพิธีการ งานกิจกรรมวิทยาลัย อบรมสัมมนาขนาดใหญ่',
    amenities: ['โปรเจกเตอร์ 4K', 'ระบบเสียงเต็มรูปแบบ', 'ไมโครโฟนไร้สาย', 'เวที'],
    status: 'active',
    color: '#8B5CF6', // Violet
    imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    order: 1,
  },
  {
    id: 'room-2',
    name: 'ห้องประชุมสักทอง',
    capacity: 0,
    floor: 2,
    description: 'ห้องประชุมขนาดกลาง รองรับการประชุมคณะกรรมการ อบรมเชิงปฏิบัติการ',
    amenities: ['โปรเจกเตอร์', 'ระบบเสียงห้องประชุม', 'ไมโครโฟนตั้งโต๊ะ', 'สมาร์ททีวี'],
    status: 'active',
    color: '#EC4899', // Pink
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    order: 2,
  },
  {
    id: 'room-3',
    name: 'ห้องประชุมกาแฟ',
    capacity: 0,
    floor: 1,
    description: 'ห้องประชุมบรรยากาศผ่อนคลาย เหมาะสำหรับบรีฟงานกลุ่มย่อยและการประสานงาน',
    amenities: ['สมาร์ททีวี', 'ไมโครโฟน', 'ไวท์บอร์ด'],
    status: 'active',
    color: '#F59E0B', // Amber
    imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    order: 3,
  },
  {
    id: 'room-4',
    name: 'อาคารโดมเอนกประสงค์',
    capacity: 0,
    floor: 1,
    description: 'อาคารกิจกรรมกลางแจ้ง/ในร่ม รองรับการจัดงานนิทรรศการ กีฬา และกิจกรรมส่วนกลาง',
    amenities: ['ระบบเสียงกลางแจ้ง', 'เวทียกพื้น', 'ไมโครโฟนลอย'],
    status: 'active',
    color: '#06B6D4', // Cyan
    imageUrl: 'https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&w=800&q=80',
    order: 4,
  },
  {
    id: 'room-5',
    name: 'ห้องประชุมหน้าห้องผู้อำนวยการ',
    capacity: 0,
    floor: 2,
    description: 'ห้องประชุมรับรองผู้บริหาร แขกผู้ใหญ่ และการประชุมระดับนโยบาย',
    amenities: ['สมาร์ททีวี', 'ระบบ Video Conference', 'ไมโครโฟนคอนเฟอเรนซ์'],
    status: 'active',
    color: '#3B82F6', // Blue
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
    order: 5,
  },
  {
    id: 'room-6',
    name: 'ห้องคอมพิวเตอร์กลาง / ห้องโสต',
    capacity: 0,
    floor: 2,
    description: 'ห้องปฏิบัติการคอมพิวเตอร์และสื่อมัลติมีเดีย พร้อมระบบเครือข่ายความเร็วสูง',
    amenities: ['เครื่องคอมพิวเตอร์ 40 ชุด', 'โปรเจกเตอร์', 'ระบบเสียงห้องโสตฯ'],
    status: 'active',
    color: '#10B981', // Emerald
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    order: 6,
  },
  {
    id: 'room-7',
    name: 'อื่นๆ (ระบุ)',
    capacity: 0,
    floor: 0,
    description: 'สถานที่หรือห้องอื่นๆ ภายในวิทยาลัยที่ต้องการขอใช้เป็นกรณีพิเศษ',
    amenities: [],
    status: 'active',
    color: '#64748B', // Slate
    order: 7,
    isOther: true,
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
