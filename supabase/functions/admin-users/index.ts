// Edge Function: admin-users
// يدير إنشاء/حذف مستخدمي Supabase Auth بأمان.
//
// ⚠️ مهم: طلبات Preflight (OPTIONS) التي يرسلها المتصفح تلقائياً قبل أي طلب فعلي
// يجب أن تُعاد عليها استجابة "OK" فوراً، بدون فحص تسجيل الدخول — لأنها لا تحتوي
// أي بيانات مصادقة أصلاً (هذا سلوك طبيعي بمعيار CORS وليس خطأ أمني).
// لذلك نتحقق من OPTIONS قبل تمرير الطلب لـ withSupabase.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const AUTH_EMAIL_DOMAIN = "shubrami.internal"; // يجب أن يطابق نفس القيمة في dashboard.jsx

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const protectedHandler = withSupabase({ auth: "user" }, async (req, ctx) => {
  try {
    const { data: { user }, error: getUserErr } = await ctx.supabase.auth.getUser();
    if (getUserErr || !user) {
      return Response.json({ error: "غير مصرح: يجب تسجيل الدخول" }, { status: 401, headers: corsHeaders });
    }

    const { data: callerProfile } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "مدير") {
      return Response.json({ error: "هذا الإجراء يتطلب صلاحية مدير" }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { username, password, name, role, allowedTabs } = body;

      if (!username || !password || !name) {
        return Response.json({ error: "بيانات ناقصة: الاسم/اسم المستخدم/كلمة المرور مطلوبة" }, { status: 400, headers: corsHeaders });
      }
      if (password.length < 6) {
        return Response.json({ error: "كلمة المرور يجب ألا تقل عن 6 خانات" }, { status: 400, headers: corsHeaders });
      }

      const email = `${String(username).trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

      const { data, error } = await ctx.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: String(username).trim().toLowerCase(),
          name,
          role,
          allowed_tabs: role === "مدير" ? [] : (allowedTabs || []),
        },
      });

      if (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
      return Response.json({ success: true, user: data.user }, { headers: corsHeaders });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return Response.json({ error: "معرّف المستخدم مطلوب" }, { status: 400, headers: corsHeaders });
      if (id === user.id) {
        return Response.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400, headers: corsHeaders });
      }

      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(id);
      if (error) {
        return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
      }
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    return Response.json({ error: "إجراء غير معروف" }, { status: 400, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message || "خطأ غير متوقع" }, { status: 500, headers: corsHeaders });
  }
});

export default {
  fetch: async (req: Request) => {
    // اعتراض طلب OPTIONS التمهيدي والرد عليه فوراً بدون أي فحص مصادقة
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    return protectedHandler(req);
  },
};
