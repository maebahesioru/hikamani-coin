import { NextResponse } from "next/server";

export async function GET() {
  const coolifyUrl = process.env.COOLIFY_URL;
  const coolifyToken = process.env.COOLIFY_TOKEN;

  if (!coolifyUrl || !coolifyToken) {
    return NextResponse.json([]);
  }

  try {
    const headers = { Authorization: `Bearer ${coolifyToken}` };
    const [appsRes, servicesRes] = await Promise.all([
      fetch(`${coolifyUrl}/api/v1/applications`, { headers, next: { revalidate: 300 } }),
      fetch(`${coolifyUrl}/api/v1/services`, { headers, next: { revalidate: 300 } }),
    ]);

    type App = { name: string; fqdn: string | null };
    type Service = { name: string; applications: App[] };

    const apps: App[] = await appsRes.json();
    const services: Service[] = await servicesRes.json();
    const serviceApps = services.flatMap(s => s.applications.filter(a => a.fqdn).map(a => ({ name: a.name, fqdn: a.fqdn })));

    const all = [...apps, ...serviceApps]
      .filter(a => a.fqdn)
      .map(a => {
        const url = a.fqdn!.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return { name: a.name, url };
      });

    return NextResponse.json(all);
  } catch {
    return NextResponse.json([]);
  }
}
