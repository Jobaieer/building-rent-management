import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !name || !password || password.length < 10) {
    console.error("Usage: npm run create-admin -- email 'password(min 10 chars)' 'Full Name'");
    process.exit(1);
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const prisma = new PrismaClient();
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  await prisma.profile.create({ data: { id: data.user.id, email, name, role: "ADMIN" } });
  console.log("Admin created:", email);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
