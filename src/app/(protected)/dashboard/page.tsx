import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>Total de Ofícios</CardHeader>
        <CardContent className="text-2xl font-bold">12</CardContent>
      </Card>

      <Card>
        <CardHeader>Pendentes</CardHeader>
        <CardContent className="text-2xl font-bold text-yellow-600">
          5
        </CardContent>
      </Card>

      <Card>
        <CardHeader>Vencidos</CardHeader>
        <CardContent className="text-2xl font-bold text-red-600">
          2
        </CardContent>
      </Card>
    </div>
  );
}

