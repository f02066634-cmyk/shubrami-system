/**
 * Higgsfield AI — سكربت Node.js بديل (يعمل من جهازك مباشرة)
 * -----------------------------------------------------------
 * استخدم هذا السكربت إذا ظهر خطأ اتصال (CORS) في أداة المتصفح.
 * عميل Higgsfield الرسمي (v2) مصمم للعمل من طرف الخادم فقط.
 *
 * التثبيت:
 *   npm install @higgsfield/client
 *
 * التشغيل:
 *   HF_CREDENTIALS="KEY_ID:KEY_SECRET" node scripts/higgsfield-generate.mjs
 *
 * وثائق الحساب والمفاتيح: https://cloud.higgsfield.ai
 * توثيق SDK: https://github.com/higgsfield-ai/higgsfield-js
 */

import { higgsfield, config } from '@higgsfield/client/v2';

// بيانات الاعتماد — يفضل قراءتها من متغير بيئة بدل كتابتها هنا مباشرة
config({
  credentials: process.env.HF_CREDENTIALS || 'YOUR_KEY_ID:YOUR_KEY_SECRET',
});

async function generateImage(prompt, aspectRatio = '1:1') {
  const jobSet = await higgsfield.subscribe('flux-pro/kontext/max/text-to-image', {
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      safety_tolerance: 2,
    },
    withPolling: true,
  });

  if (jobSet.isCompleted) {
    console.log('✅ رابط الصورة:', jobSet.jobs[0].results?.raw.url);
  } else {
    console.log('❌ لم يكتمل التوليد. الحالة:', jobSet.jobs[0]?.status);
  }
}

async function generateVideo(prompt, imageUrl) {
  const jobSet = await higgsfield.subscribe('/v1/image2video/dop', {
    input: {
      model: 'dop-turbo',
      prompt,
      input_images: [{ type: 'image_url', image_url: imageUrl }],
    },
    withPolling: true,
  });

  if (jobSet.isCompleted) {
    console.log('✅ رابط الفيديو:', jobSet.jobs[0].results?.raw.url);
  } else {
    console.log('❌ لم يكتمل التوليد. الحالة:', jobSet.jobs[0]?.status);
  }
}

// مثال استخدام — عدّل حسب حاجتك:
generateImage('منظر جبلي عند الغروب، إضاءة سينمائية', '16:9');
// generateVideo('حركة كاميرا سينمائية حول الشخص', 'https://example.com/image.jpg');
