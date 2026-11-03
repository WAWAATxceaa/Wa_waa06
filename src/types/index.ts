export type RoomStatus = 'active' | 'maintenance' | 'inactive';

// สายอนุมัติ 4 ขั้น:
// 1. submitted (ยื่นคำขอแล้ว / รอตรวจความพร้อม)
// 2. pending_step2 (รอตรวจความพร้อมห้องและโสตฯ: นายวัชรพงศ์ โสภา)
// 3. pending_step3 (รอรับรอง: นายเอกราช เขียวทอง หัวหน้างานศูนย์ดิจิทัลฯ)
// 4. pending_step4 (รอพิจารณาอนุมัติ: นายชาตรี เริงชัยภูมิ รองผู้อำนวยการฯ)
// 5. approved (อนุมัติเรียบร้อย)
// 6. rejected (ไม่อนุมัติ / ส่งกลับ)
// 7. cancelled (ยกเลิกโดยผู้ขอ)
export type ApprovalStatus =
  | 'pending_step2'
  | 'pending_step3'
  | 'pending_step4'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'confirmed';

export type ApproverRole =
  | 'requester'
  | 'staff_audiovisual' // นายวัชรพงศ์ โสภา
  | 'chief_digital'      // นายเอกราช เขียวทอง
  | 'deputy_director'   // นายชาตรี เริงชัยภูมิ
  | 'admin';

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  description?: string;
  amenities: string[];
  status: RoomStatus;
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
  imageUrl?: string;
  color: string;
  order: number;
  isOther?: boolean;
  // Computed properties
  isAvailableNow?: boolean;
  currentBooking?: {
    id: string;
    title: string;
    bookerName: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface EquipmentSelection {
  projector: boolean;
  soundSystem: boolean;
  microphone: boolean;
  extraTableChair: boolean;
  customItem1?: string;
  customItem2?: string;
  extraTableCount?: number;
  extraChairCount?: number;
}

export interface ApprovalStepLog {
  step: 1 | 2 | 3 | 4;
  title: string;
  actorName: string;
  actorRole: ApproverRole;
  action: 'submit' | 'ready' | 'not_ready' | 'endorsed' | 'returned' | 'approved' | 'rejected' | 'cancelled';
  statusThai: string;
  note?: string;
  timestamp: string;
}

export interface Booking {
  id: string;
  bookingCode: string; // e.g. "TTC-8429"
  roomId: string;
  roomName: string;
  otherRoomName?: string;
  roomColor?: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  participantCount: number;
  
  // ผู้ขอใช้
  bookerName: string;
  bookerPosition: string; // ตำแหน่ง
  department: string; // หน่วยงาน/แผนกวิชา
  bookerContact: string; // เบอร์โทร
  title: string; // หัวข้อ/วัตถุประสงค์
  description?: string; // รายละเอียดเพิ่มเติม

  // ครุภัณฑ์และอุปกรณ์
  equipment: EquipmentSelection;
  extraTableCount?: number;
  extraChairCount?: number;
  amenities?: string[];
  amenitiesText?: string; // รวมชื่ออุปกรณ์สำหรับแสดงผลสรุป

  // ไฟล์แนบกำหนดการ
  attachmentUrl?: string; // ลิงก์ไฟล์ใน Google Drive
  attachmentName?: string;
  attachmentType?: string; // 'pdf' | 'image'

  // การยืนยันของทางราชการ
  assetCareConfirmed: boolean; // "ยืนยันการดูแลรักษาทรัพย์สินของทางราชการ"

  // สายอนุมัติ 4 ขั้น (ห้ามข้ามขั้น)
  status: ApprovalStatus;
  statusThai?: string;
  currentStep: 1 | 2 | 3 | 4;

  // รายละเอียดการลงนามแต่ละขั้น
  step1SubmittedAt: string;
  step2StaffName?: string;
  step2StaffStatus?: 'ready' | 'not_ready' | 'pending';
  step2StaffNote?: string;
  step2StaffTimestamp?: string;

  step3ChiefName?: string;
  step3ChiefStatus?: 'endorsed' | 'returned' | 'pending';
  step3ChiefNote?: string;
  step3ChiefTimestamp?: string;

  step4DeputyName?: string;
  step4DeputyStatus?: 'approved' | 'rejected' | 'pending';
  step4DeputyNote?: string;
  step4DeputyTimestamp?: string;

  // ประวัติการดำเนินงาน (Audit Trail)
  logs: ApprovalStepLog[];

  cancelledReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  systemTitle: string;
  organizationName: string;
  subDepartment: string;
  
  // ผู้ลงนาม 4 ขั้น (ตั้งค่าได้จากหลังบ้าน)
  staffAudiovisual: {
    name: string;
    position: string;
    pin: string;
  };
  chiefDigital: {
    name: string;
    position: string;
    pin: string;
  };
  deputyDirector: {
    name: string;
    position: string;
    pin: string;
  };
  admin: {
    pin: string;
  };

  // ครุภัณฑ์ตั้งค่าได้
  customEquipment1Label: string;
  customEquipment2Label: string;

  // Webhook แจ้งเตือน
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramEnabled?: boolean;
  lineNotifyToken?: string;
  lineNotifyEnabled?: boolean;
  googleChatWebhookUrl?: string;
  googleChatEnabled?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isActive: boolean;
  type: 'info' | 'warning' | 'urgent';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'new_booking' | 'booking_updated' | 'booking_cancelled' | 'step_approved' | 'step_rejected' | 'reminder_15min' | 'system';
  bookingId?: string;
  bookingCode?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
