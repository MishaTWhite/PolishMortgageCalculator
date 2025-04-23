import { Card, CardContent } from "@/components/ui/card";

export default function InfoSection() {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">Jak działa kalkulator?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-2">Dane wejściowe</h3>
            <ul className="list-disc list-inside text-sm space-y-2 text-text-secondary">
              <li>Wprowadź cenę nieruchomości</li>
              <li>Ustaw wysokość wkładu własnego (minimum 10%)</li>
              <li>Wybierz okres kredytowania lub wysokość raty miesięcznej</li>
              <li>Stopa bazowa NBP pobierana jest automatycznie</li>
              <li>Marżę banku możesz dostosować wg aktualnych ofert</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">Formuła obliczeniowa</h3>
            <p className="text-sm text-text-secondary mb-2">
              Kalkulator wykorzystuje standardowy model obliczeniowy stosowany przez polskie banki:
            </p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-mono">
                R = K × (r / 12) × (1 + r / 12)<sup>n</sup> / ((1 + r / 12)<sup>n</sup> - 1)
              </p>
              <p className="text-xs text-text-tertiary mt-2">
                gdzie:<br />
                R - rata miesięczna<br />
                K - kwota kredytu<br />
                r - oprocentowanie roczne<br />
                n - liczba rat (okres kredytowania w miesiącach)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
