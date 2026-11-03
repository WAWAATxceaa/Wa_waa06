import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import { Booking, SystemSettings } from '../../types';
import { formatThaiDate } from '../../utils/dateUtils';

interface OfficialRequestPrintModalProps {
  booking: Booking;
  settings: SystemSettings;
  onClose: () => void;
}

export const OfficialRequestPrintModal: React.FC<OfficialRequestPrintModalProps> = ({
  booking,
  settings,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const todayStr = formatThaiDate(new Date().toISOString());
  const bookingDateStr = formatThaiDate(booking.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      {/* Control bar - hidden during print */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์ใบคำขอ A4 (ราชการ)</span>
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* A4 Paper Document Container */}
      <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-2xl rounded-2xl my-auto print:m-0 print:p-6 print:w-full print:max-w-none print:shadow-none print:rounded-none font-serif text-[13px] leading-relaxed relative">
        {/* Style Tag for @media print A4 precision */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-a4-area, .print-a4-area * {
              visibility: visible;
            }
            .print-a4-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 15mm 20mm !important;
              box-shadow: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}} />

        <div className="print-a4-area">
          {/* Header with Garuda / College Emblem */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
              {/* Official Emblem Icon SVG */}
              <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-800 fill-current">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M50 15 L55 35 L75 35 L60 48 L65 70 L50 55 L35 70 L40 48 L25 35 L45 35 Z" fill="currentColor" />
              </svg>
            </div>
            <h1 className="font-bold text-lg sm:text-xl tracking-wide font-sans">
              แบบขออนุญาตใช้ห้องประชุมและอุปกรณ์โสตทัศนูปกรณ์
            </h1>
            <p className="text-xs text-slate-700 font-sans font-medium">
              งานศูนย์ดิจิทัลและสื่อสารองค์กร วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
            </p>
            <div className="flex justify-between items-center text-xs mt-3 border-b border-slate-300 pb-2">
              <span><strong>รหัสคำขอ:</strong> {booking.bookingCode}</span>
              <span><strong>วันที่เขียนคำขอ:</strong> {todayStr}</span>
            </div>
          </div>

          {/* Section 1: ข้อมูลผู้ขอใช้ */}
          <div className="space-y-2 mb-4 text-justify">
            <p>
              &emsp;&emsp;ข้าพเจ้า <span className="font-bold underline">{booking.bookerName || '...................................................'}</span>
              &nbsp;ตำแหน่ง <span className="font-bold underline">{booking.bookerPosition || '...........................................'}</span>
              &nbsp;แผนกวิชา/งาน <span className="font-bold underline">{booking.department || '...........................................'}</span>
            </p>
            <p>
              เบอร์โทรศัพท์ติดต่อ <span className="font-bold underline">{booking.bookerContact || '...........................................'}</span>
              &nbsp;มีความประสงค์ขออนุญาตใช้ห้องประชุม <span className="font-bold underline">{booking.otherRoomName || booking.roomName}</span>
            </p>
            <p>
              ในวันที่ <span className="font-bold underline">{bookingDateStr}</span>
              &nbsp;ตั้งแต่เวลา <span className="font-bold underline">{booking.startTime}</span> น.
              &nbsp;ถึงเวลา <span className="font-bold underline">{booking.endTime}</span> น.
              &nbsp;จำนวนผู้เข้าร่วมประชุมประมาณ <span className="font-bold underline">{booking.participantCount}</span> คน
            </p>
            <p>
              เพื่อใช้ในการ (วัตถุประสงค์) <span className="font-bold underline">{booking.title}</span>
              {booking.description && <span>&nbsp;({booking.description})</span>}
            </p>
          </div>

          {/* Section 2: รายการครุภัณฑ์และอุปกรณ์ */}
          <div className="mb-4 p-3 border border-slate-400 rounded-lg">
            <div className="font-bold text-xs mb-2">
              มีความประสงค์ขอรับการสนับสนุนอุปกรณ์และโสตทัศนูปกรณ์ ดังรายการต่อไปนี้:
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <label className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                  {booking.equipment?.projector ? '✓' : ''}
                </span>
                <span>เครื่องโปรเจกเตอร์ / จอภาพ</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                  {booking.equipment?.soundSystem ? '✓' : ''}
                </span>
                <span>เครื่องเสียงห้องประชุม</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                  {booking.equipment?.microphone ? '✓' : ''}
                </span>
                <span>ไมโครโฟน</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                  {booking.equipment?.extraTableChair ? '✓' : ''}
                </span>
                <span>
                  โต๊ะ/เก้าอี้เสริม (โต๊ะ {booking.extraTableCount || 0} ตัว, เก้าอี้ {booking.extraChairCount || 0} ตัว)
                </span>
              </label>

              <label className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                  {booking.equipment?.customItem1 ? '✓' : ''}
                </span>
                <span>{booking.equipment?.customItem1 || settings.customEquipment1Label || 'อุปกรณ์เสริม 1'}</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold">
                  {booking.equipment?.customItem2 ? '✓' : ''}
                </span>
                <span>{booking.equipment?.customItem2 || settings.customEquipment2Label || 'อุปกรณ์เสริม 2'}</span>
              </label>
            </div>
          </div>

          {/* Section 3: คำรับรองการดูแลทรัพย์สิน */}
          <div className="text-xs mb-5 text-justify italic text-slate-800">
            &emsp;&emsp;ข้าพเจ้าและคณะผู้ขอใช้ห้องประชุม ยินดีปฏิบัติตามระเบียบการใช้สถานที่ของวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์อย่างเคร่งครัด พร้อมทั้งดูแลรักษาอุปกรณ์และทรัพย์สินของทางราชการให้อยู่ในสภาพสมบูรณ์เรียบร้อย หากมีความเสียหายเกิดขึ้นพร้อมชดใช้ตามระเบียบของทางราชการ
          </div>

          {/* Section 4: กล่องลงนาม 4 จุดตามสายอนุมัติ */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Box 1: ผู้ขอใช้ */}
            <div className="p-3 border border-slate-400 rounded-lg flex flex-col justify-between text-center min-h-[120px]">
              <div className="font-bold mb-4">๑. ผู้ขอใช้ห้องประชุม</div>
              <div>
                <p>ลงชื่อ............................................................</p>
                <p className="font-bold mt-1">({booking.bookerName})</p>
                <p className="text-[11px] text-slate-600">ตำแหน่ง {booking.bookerPosition || 'ผู้ขอใช้'}</p>
                <p className="text-[10px] text-slate-500">วันที่ {todayStr}</p>
              </div>
            </div>

            {/* Box 2: เจ้าหน้าที่โสตฯ (นายวัชรพงศ์ โสภา) */}
            <div className="p-3 border border-slate-400 rounded-lg flex flex-col justify-between text-center min-h-[120px]">
              <div className="font-bold mb-1">๒. เจ้าหน้าที่งานโสตทัศนูปกรณ์</div>
              <div className="text-[11px] mb-2 text-left pl-2">
                ความเห็น: {booking.step2StaffStatus === 'ready' ? '✅ ห้องและอุปกรณ์พร้อมใช้งาน' : '...........................................'}
                {booking.step2StaffNote && <div className="text-[10px]">หมายเหตุ: {booking.step2StaffNote}</div>}
              </div>
              <div>
                <p>ลงชื่อ............................................................</p>
                <p className="font-bold mt-1">({settings.staffAudiovisual.name})</p>
                <p className="text-[11px] text-slate-600">{settings.staffAudiovisual.position}</p>
                <p className="text-[10px] text-slate-500">วันที่ {booking.step2StaffTimestamp ? formatThaiDate(booking.step2StaffTimestamp) : '....../....../......'}</p>
              </div>
            </div>

            {/* Box 3: หัวหน้างานศูนย์ดิจิทัลฯ (นายเอกราช เขียวทอง) */}
            <div className="p-3 border border-slate-400 rounded-lg flex flex-col justify-between text-center min-h-[120px]">
              <div className="font-bold mb-1">๓. หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร</div>
              <div className="text-[11px] mb-2 text-left pl-2">
                ความเห็น: {booking.step3ChiefStatus === 'endorsed' ? '✅ รับรองคำขอใช้ห้อง' : '...........................................'}
                {booking.step3ChiefNote && <div className="text-[10px]">หมายเหตุ: {booking.step3ChiefNote}</div>}
              </div>
              <div>
                <p>ลงชื่อ............................................................</p>
                <p className="font-bold mt-1">({settings.chiefDigital.name})</p>
                <p className="text-[11px] text-slate-600">{settings.chiefDigital.position}</p>
                <p className="text-[10px] text-slate-500">วันที่ {booking.step3ChiefTimestamp ? formatThaiDate(booking.step3ChiefTimestamp) : '....../....../......'}</p>
              </div>
            </div>

            {/* Box 4: รองผู้อำนวยการฯ (นายชาตรี เริงชัยภูมิ) */}
            <div className="p-3 border border-slate-400 rounded-lg flex flex-col justify-between text-center min-h-[120px]">
              <div className="font-bold mb-1">๔. การพิจารณาอนุมัติ</div>
              <div className="text-[11px] mb-2 text-left pl-2">
                คำสั่ง: {booking.status === 'approved' ? '✅ อนุมัติให้ใช้ห้องประชุม' : '...........................................'}
                {booking.step4DeputyNote && <div className="text-[10px]">หมายเหตุ: {booking.step4DeputyNote}</div>}
              </div>
              <div>
                <p>ลงชื่อ............................................................</p>
                <p className="font-bold mt-1">({settings.deputyDirector.name})</p>
                <p className="text-[11px] text-slate-600">{settings.deputyDirector.position}</p>
                <p className="text-[10px] text-slate-500">วันที่ {booking.step4DeputyTimestamp ? formatThaiDate(booking.step4DeputyTimestamp) : '....../....../......'}</p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-4 text-[10px] text-slate-500 text-center border-t border-slate-200 pt-2">
            *แบบพิมพ์ทางราชการสร้างโดยระบบอัตโนมัติ TTC Smart Meeting Room Dashboard • วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
          </div>
        </div>
      </div>
    </div>
  );
};
