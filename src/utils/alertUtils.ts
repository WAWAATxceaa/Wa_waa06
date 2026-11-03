import Swal from 'sweetalert2';

/**
 * Utility functions for SweetAlert2 with Gen Z modern styling
 */
export const showSuccessAlert = async (title: string, htmlOrText: string) => {
  return Swal.fire({
    title,
    html: htmlOrText,
    icon: 'success',
    confirmButtonText: 'ตกลง ✨',
    confirmButtonColor: '#8B5CF6',
    background: document.documentElement.classList.contains('dark') ? '#0F172A' : '#FFFFFF',
    color: document.documentElement.classList.contains('dark') ? '#F8FAFC' : '#0F172A',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-violet-200 dark:border-violet-900',
      confirmButton: 'rounded-2xl px-6 py-2.5 font-bold shadow-lg shadow-violet-500/30',
    },
  });
};

export const showErrorAlert = async (title: string, htmlOrText: string) => {
  return Swal.fire({
    title,
    html: htmlOrText,
    icon: 'error',
    confirmButtonText: 'เข้าใจแล้ว',
    confirmButtonColor: '#F43F5E',
    background: document.documentElement.classList.contains('dark') ? '#0F172A' : '#FFFFFF',
    color: document.documentElement.classList.contains('dark') ? '#F8FAFC' : '#0F172A',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900',
      confirmButton: 'rounded-2xl px-6 py-2.5 font-bold shadow-lg shadow-rose-500/30',
    },
  });
};

export const showConfirmAlert = async (
  title: string,
  text: string,
  confirmButtonText = 'ยืนยัน',
  cancelButtonText = 'ยกเลิก'
) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#8B5CF6',
    cancelButtonColor: '#64748B',
    background: document.documentElement.classList.contains('dark') ? '#0F172A' : '#FFFFFF',
    color: document.documentElement.classList.contains('dark') ? '#F8FAFC' : '#0F172A',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800',
      confirmButton: 'rounded-2xl px-6 py-2.5 font-bold shadow-lg shadow-violet-500/30',
      cancelButton: 'rounded-2xl px-6 py-2.5 font-bold',
    },
  });
};

export const showPromptAlert = async (
  title: string,
  inputPlaceholder = 'กรอกหมายเหตุ หรือข้อความ...',
  confirmButtonText = 'ส่งข้อมูล'
) => {
  return Swal.fire({
    title,
    input: 'textarea',
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#8B5CF6',
    cancelButtonColor: '#64748B',
    background: document.documentElement.classList.contains('dark') ? '#0F172A' : '#FFFFFF',
    color: document.documentElement.classList.contains('dark') ? '#F8FAFC' : '#0F172A',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800',
      confirmButton: 'rounded-2xl px-6 py-2.5 font-bold shadow-lg shadow-violet-500/30',
      cancelButton: 'rounded-2xl px-6 py-2.5 font-bold',
      input: 'rounded-2xl border-slate-200 dark:border-slate-700 text-sm',
    },
  });
};

export const showLoadingAlert = (title = 'กำลังดำเนินการ...') => {
  Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
    background: document.documentElement.classList.contains('dark') ? '#0F172A' : '#FFFFFF',
    color: document.documentElement.classList.contains('dark') ? '#F8FAFC' : '#0F172A',
    customClass: {
      popup: 'rounded-3xl shadow-2xl',
    },
  });
};

export const closeAlert = () => {
  Swal.close();
};
