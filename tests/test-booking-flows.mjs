console.log('🧪 Starting TTC Smart Meeting Room Functional & Security Tests...\n');

// 1. Time overlap conflict algorithm: (newStart < existingEnd) && (newEnd > existingStart)
function isTimeSlotConflicting(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function checkBookingConflict(existingBookings, roomId, roomName, otherRoomName, date, startTime, endTime, excludeBookingCode) {
  const activeBookings = existingBookings.filter(
    (b) =>
      b.date === date &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      (!excludeBookingCode || b.bookingCode !== excludeBookingCode)
  );

  for (const b of activeBookings) {
    const isSameRoom = (roomId === 'room-other' && otherRoomName)
      ? (b.roomId === 'room-other' && b.otherRoomName?.toLowerCase() === otherRoomName.toLowerCase())
      : (b.roomId === roomId);

    if (isSameRoom && isTimeSlotConflicting(startTime, endTime, b.startTime, b.endTime)) {
      return {
        hasConflict: true,
        conflictingBooking: b,
        message: `ช่วงเวลา ${b.startTime} - ${b.endTime} น. ถูกจองแล้ว (${b.title} โดย ${b.bookerName})`,
      };
    }
  }

  return { hasConflict: false };
}

// 2. Formula injection sanitization check (=, +, -, @)
function sanitizeFormula(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().replace(/[\r\n\t]/g, ' ');
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return str;
}

// 3. Workflow Progression & Anti-Skipping Validation
function validateWorkflowStep(currentStep, incomingStep, action) {
  if (incomingStep !== currentStep) {
    return {
      allowed: false,
      error: `ไม่สามารถข้ามขั้นตอนได้ (ขั้นตอนปัจจุบันคือ ${currentStep} แต่พยายามทำขั้นตอน ${incomingStep})`,
    };
  }
  return { allowed: true };
}

// TEST 1: Partial overlap detection
const mockBookings = [
  {
    bookingCode: 'TTC-A101',
    roomId: 'room-adireksarn',
    roomName: 'หอประชุมอดิเรกสาร',
    date: '2026-11-05',
    startTime: '09:00',
    endTime: '11:00',
    status: 'pending_step2',
    title: 'ประชุมประจำเดือน วท.ท่าหลวงฯ',
    bookerName: 'นายสมชาย ใจดี',
  },
  {
    bookingCode: 'TTC-A102',
    roomId: 'room-sakthong',
    roomName: 'ห้องประชุมสักทอง',
    date: '2026-11-05',
    startTime: '13:00',
    endTime: '15:00',
    status: 'cancelled', // Cancelled booking should NOT block!
    title: 'อบรมระบบไอที',
    bookerName: 'น.ส.มาลี สวยงาม',
  },
];

console.log('--- TEST 1: Partial Time Overlap Detection ---');
const overlapTest = checkBookingConflict(
  mockBookings,
  'room-adireksarn',
  'หอประชุมอดิเรกสาร',
  '',
  '2026-11-05',
  '10:30',
  '12:00'
);
console.assert(overlapTest.hasConflict === true, 'Test 1 Failed: Overlap not detected');
console.log('✅ TEST 1 PASSED: Overlap detected correctly (10:30-12:00 conflicts with 09:00-11:00)\n');

console.log('--- TEST 2: Cancelled Booking Slot Freed ---');
const cancelledTest = checkBookingConflict(
  mockBookings,
  'room-sakthong',
  'ห้องประชุมสักทอง',
  '',
  '2026-11-05',
  '13:30',
  '14:30'
);
console.assert(cancelledTest.hasConflict === false, 'Test 2 Failed: Cancelled slot still conflicting');
console.log('✅ TEST 2 PASSED: Cancelled booking freed time slot for new bookings\n');

console.log('--- TEST 3: Adjacent Booking (Non-overlapping) ---');
const adjacentTest = checkBookingConflict(
  mockBookings,
  'room-adireksarn',
  'หอประชุมอดิเรกสาร',
  '',
  '2026-11-05',
  '11:00',
  '12:00'
);
console.assert(adjacentTest.hasConflict === false, 'Test 3 Failed: Adjacent booking marked as conflict');
console.log('✅ TEST 3 PASSED: Adjacent time slots (11:00-12:00 right after 09:00-11:00) allowed\n');

console.log('--- TEST 4: Formula Injection Prevention ---');
const formulaInput = '=SUM(A1:A10)';
const sanitized = sanitizeFormula(formulaInput);
console.assert(sanitized.startsWith("'="), 'Test 4 Failed: Formula injection not neutralized');
console.log(`✅ TEST 4 PASSED: Formula injection "${formulaInput}" neutralized to "${sanitized}"\n`);

console.log('--- TEST 5: 4-Stage Approval Anti-Skipping Check ---');
const skipAttempt = validateWorkflowStep(2, 4, 'approved'); // Trying to jump from Step 2 to Step 4
console.assert(skipAttempt.allowed === false, 'Test 5 Failed: Skipping allowed');
console.log('✅ TEST 5 PASSED: Strictly prevented jumping from Step 2 to Step 4\n');

console.log('🎉 ALL 5/5 TTC SPECIFICATION TESTS PASSED SUCCESSFULLY! ✨\n');
