jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TourQueryFlightsTab } from "@/components/tour-queries/TourQueryFlightsTab";
import type { FlightDetailRow } from "@/components/tour-queries/types";

function FlightsHarness({
  initial = [],
}: {
  initial?: FlightDetailRow[];
}) {
  const [flightDetails, setFlightDetails] =
    useState<FlightDetailRow[]>(initial);

  return (
    <TourQueryFlightsTab
      flightDetails={flightDetails}
      setFlightDetails={setFlightDetails}
      getTokenForUpload={jest.fn(async () => "token")}
    />
  );
}

describe("TourQueryFlightsTab", () => {
  it("adds, edits, and removes a flight detail row", () => {
    render(<FlightsHarness />);

    expect(screen.getByText("0 flights")).toBeTruthy();
    expect(screen.getByText("No flight details yet.")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tq-flight-add"));

    expect(screen.getByText("1 flight")).toBeTruthy();
    expect(screen.getByTestId("tq-flight-card-0")).toBeTruthy();

    fireEvent.changeText(screen.getByTestId("tq-flight-name-0"), "Indigo");
    fireEvent.changeText(screen.getByTestId("tq-flight-number-0"), "6E 123");
    fireEvent.changeText(screen.getByTestId("tq-flight-from-0"), "DEL");
    fireEvent.changeText(screen.getByTestId("tq-flight-to-0"), "SXR");
    fireEvent.changeText(screen.getByTestId("tq-flight-departure-0"), "06:30");
    fireEvent.changeText(screen.getByTestId("tq-flight-arrival-0"), "08:10");
    fireEvent.changeText(screen.getByTestId("tq-flight-duration-0"), "1h 40m");

    expect(screen.getByDisplayValue("Indigo")).toBeTruthy();
    expect(screen.getByDisplayValue("6E 123")).toBeTruthy();
    expect(screen.getByDisplayValue("DEL")).toBeTruthy();
    expect(screen.getByDisplayValue("SXR")).toBeTruthy();
    expect(screen.getByDisplayValue("06:30")).toBeTruthy();
    expect(screen.getByDisplayValue("08:10")).toBeTruthy();
    expect(screen.getByDisplayValue("1h 40m")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tq-flight-remove-0"));

    expect(screen.getByText("0 flights")).toBeTruthy();
    expect(screen.queryByTestId("tq-flight-card-0")).toBeNull();
  });

  it("renders existing flight images through the gallery", () => {
    render(
      <FlightsHarness
        initial={[
          {
            id: "flight-1",
            date: "2026-07-16",
            flightName: "Air India",
            flightNumber: "AI 101",
            from: "BOM",
            to: "DEL",
            departureTime: "09:00",
            arrivalTime: "11:05",
            flightDuration: "2h 05m",
            images: [{ url: "/uploads/flight-ticket.png" }],
          },
        ]}
      />
    );

    expect(screen.getByText("1 flight")).toBeTruthy();
    expect(screen.getByText("1 image(s)")).toBeTruthy();
    expect(screen.getByTestId("tq-flight-images-0-remove-0")).toBeTruthy();
  });
});
