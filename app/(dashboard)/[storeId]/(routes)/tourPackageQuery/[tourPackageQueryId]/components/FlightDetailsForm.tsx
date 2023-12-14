import React from 'react';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

import { Button } from "@/components/ui/button"
import { Input } from '@/components/ui/input';
interface FlightDetail {
    date: string;
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
}

interface Props {
    flightDetails: FlightDetail[];
    updateFlightDetails: (index: number, field: keyof FlightDetail, value: string) => void;
    addFlight: () => void;
    removeFlight: (index: number) => void;
}

const FlightDetailsForm: React.FC<Props> = ({ flightDetails, updateFlightDetails, addFlight, removeFlight }) => {
    return (
        <>
            <div className="md:grid md:grid-cols-3 gap-8">
                {flightDetails.map((flight, index) => (
                    <div key={index} className="space-y-4">
                        <FormControl>

                            <Input
                                placeholder="Date"
                                type="date"
                                value={flight.date}
                                onChange={(e) => updateFlightDetails(index, 'date', e.target.value)}
                            />
                        </FormControl>

                        <FormControl>

                            <Input
                                placeholder="From"
                                value={flight.from}
                                onChange={(e) => updateFlightDetails(index, 'from', e.target.value)}
                            />
                        </FormControl>

                        <FormControl>

                            <Input
                                placeholder="To"
                                value={flight.to}
                                onChange={(e) => updateFlightDetails(index, 'to', e.target.value)}
                            />
                        </FormControl>

                        <FormControl>

                            <Input
                                placeholder="Departure Time"
                                type="time"
                                value={flight.departureTime}
                                onChange={(e) => updateFlightDetails(index, 'departureTime', e.target.value)}
                            />
                        </FormControl>

                        <FormControl>

                            <Input
                                placeholder="Arrival Time"
                                type="time"
                                value={flight.arrivalTime}
                                onChange={(e) => updateFlightDetails(index, 'arrivalTime', e.target.value)}
                            />
                        </FormControl>

                        <Button type="button" onClick={() => removeFlight(index)} variant="destructive">
                            Remove Flight
                        </Button>
                    </div>
                ))}

                <Button type="button" onClick={addFlight}>Add Flight</Button>
            </div>
        </>
    );
};

export default FlightDetailsForm;
