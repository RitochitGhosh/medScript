"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { Hospital } from "@workspace/types";

interface HospitalCardProps {
  hospital: Hospital;
  onAddToReferral: (hospital: Hospital) => void;
  isSelected?: boolean;
}

export function HospitalCard({
  hospital,
  onAddToReferral,
  isSelected = false,
}: HospitalCardProps) {
  const [added, setAdded] = useState(isSelected);

  function handleAdd() {
    setAdded(true);
    onAddToReferral(hospital);
  }

  return (
    <Card className={added ? "border-green-400 bg-green-50/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{hospital.name}</CardTitle>
          {hospital.distance && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {hospital.distance}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-start gap-1 text-sm text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 mt-0.5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs">{hospital.address}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {hospital.specialty}
          </Badge>
        </div>

        {hospital.contact && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3 h-3 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z"
                clipRule="evenodd"
              />
            </svg>
            {hospital.contact}
          </div>
        )}

        <Button
          size="sm"
          variant={added ? "secondary" : "default"}
          className="w-full mt-2"
          onClick={handleAdd}
          disabled={added}
        >
          {added ? "Added to Prescription" : "Add to Prescription"}
        </Button>
      </CardContent>
    </Card>
  );
}
