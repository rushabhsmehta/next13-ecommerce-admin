"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, subMonths, isAfter, isBefore, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, DollarSignIcon, TrendingUpIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// You might need to install recharts: npm install recharts
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface ProfitReportProps {
    initialData: Array<any>;
    generalExpenses: Array<any>;
    generalIncomes: Array<any>;
}

export default function ProfitReport({ initialData, generalExpenses, generalIncomes }: ProfitReportProps) {
    const [date, setDate] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 6),
        to: new Date(),
    });

    const [filterLocation, setFilterLocation] = useState<string>("all");
    const [activeTab, setActiveTab] = useState("overview");
    type QueryFinancialKey = 'id' | 'name' | 'location' | 'date' | 'sales' | 'purchases' | 'expenses' | 'incomes' | 'profit' | 'profitMargin';

    const [sortConfig, setSortConfig] = useState<{
        key: QueryFinancialKey;
        direction: 'ascending' | 'descending';
    }>({
        key: 'profit',
        direction: 'descending'
    });

    // Handle from date change
    const handleFromDateChange = (selectedDate: Date | undefined) => {
        setDate(current => ({
            from: selectedDate,
            to: current?.to
        }));
    };

    // Handle to date change
    const handleToDateChange = (selectedDate: Date | undefined) => {
        setDate(current => ({
            from: current?.from,
            to: selectedDate
        }));
    };

    // Extract unique locations for filter
    const locations = useMemo(() => {
        const locSet = new Set(initialData.map(item => item.location.label));
        return Array.from(locSet);
    }, [initialData]);

    // Filter data based on selected date range and location
    const filteredData = useMemo(() => {
        return initialData.filter(item => {
            const itemDate = new Date(item.createdAt);
            const locationMatch = filterLocation === "all" || item.location.label === filterLocation;
            const dateMatch = (!date?.from || isAfter(itemDate, date.from)) &&
                (!date?.to || isBefore(itemDate, date.to));
            return locationMatch && dateMatch;
        });
    }, [initialData, date, filterLocation]);

    // Filter general expenses and incomes based on date range
    const filteredGeneralExpenses = useMemo(() => {
        return generalExpenses.filter(expense => {
            const expenseDate = new Date(expense.expenseDate);
            const dateMatch = (!date?.from || isAfter(expenseDate, date.from)) &&
                (!date?.to || isBefore(expenseDate, date.to));
            return dateMatch;
        });
    }, [generalExpenses, date]);

    const filteredGeneralIncomes = useMemo(() => {
        return generalIncomes.filter(income => {
            const incomeDate = new Date(income.incomeDate);
            const dateMatch = (!date?.from || isAfter(incomeDate, date.from)) &&
                (!date?.to || isBefore(incomeDate, date.to));
            return dateMatch;
        });
    }, [generalIncomes, date]);

    // Calculate financial metrics including general expenses and incomes
    const financialMetrics = useMemo(() => {
        let totalSales = 0;
        let totalPurchases = 0;
        let totalPackageExpenses = 0;
        let totalGeneralExpenses = 0;
        let totalPackageIncomes = 0;
        let totalGeneralIncomes = 0;
        let totalReceipts = 0;
        let totalPayments = 0;
        let packageCount = filteredData.length;
        let profitablePackages = 0;
        let totalPackageProfit = 0;  // Initialize this variable for package profits

        const categoryExpenses: Record<string, number> = {};
        const categoryIncomes: Record<string, number> = {};
        const monthlyProfits: Record<string, { month: string, profit: number, sales: number, expenses: number, incomes: number }> = {};

        // Calculate package-related finances
        filteredData.forEach(pkg => {
            // Calculate sales and receipts
            const sales = pkg.saleDetails.reduce((sum: number, sale: any) => sum + sale.salePrice, 0);
            const receipts = pkg.receiptDetails.reduce((sum: number, receipt: any) => sum + receipt.amount, 0);
            totalSales += sales;
            totalReceipts += receipts;

            // Calculate purchases and payments
            const purchases = pkg.purchaseDetails.reduce((sum: number, purchase: any) => sum + purchase.price, 0);
            const payments = pkg.paymentDetails.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            totalPurchases += purchases;
            totalPayments += payments;

            // Calculate package expenses
            const packageExpenses = pkg.expenseDetails.reduce((sum: number, expense: any) => sum + expense.amount, 0);
            totalPackageExpenses += packageExpenses;

            // Track package expenses by category
            pkg.expenseDetails.forEach((expense: any) => {
                const category = expense.expenseCategory?.name || "Uncategorized";
                categoryExpenses[category] = (categoryExpenses[category] || 0) + expense.amount;
            });

            // Calculate package incomes
            const packageIncomes = pkg.incomeDetails.reduce((sum: number, income: any) => sum + income.amount, 0);
            totalPackageIncomes += packageIncomes;

            // Track package incomes by category
            pkg.incomeDetails.forEach((income: any) => {
                const category = income.incomeCategory?.name || "Uncategorized";
                categoryIncomes[category] = (categoryIncomes[category] || 0) + income.amount;
            });

            // Calculate profit for this package
            const packageProfit = sales - (purchases + packageExpenses) + packageIncomes;
            
            // Add to total package profit
            totalPackageProfit += packageProfit;

            if (packageProfit > 0) {
                profitablePackages++;
            }

            // Track monthly data
            const monthYear = format(new Date(pkg.createdAt), "MMM yyyy");
            if (!monthlyProfits[monthYear]) {
                monthlyProfits[monthYear] = {
                    month: monthYear,
                    profit: 0,
                    sales: 0,
                    expenses: 0,
                    incomes: 0
                };
            }
            monthlyProfits[monthYear].profit += packageProfit;
            monthlyProfits[monthYear].sales += sales;
            monthlyProfits[monthYear].expenses += (purchases + packageExpenses);
            monthlyProfits[monthYear].incomes = packageIncomes;
        });

        // Add general expenses
        totalGeneralExpenses = filteredGeneralExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Track general expenses by category
        filteredGeneralExpenses.forEach((expense) => {
            const category = expense.expenseCategory?.name || "Uncategorized";
            categoryExpenses[category] = (categoryExpenses[category] || 0) + expense.amount;

            // Add to monthly data
            const monthYear = format(new Date(expense.expenseDate), "MMM yyyy");
            if (!monthlyProfits[monthYear]) {
                monthlyProfits[monthYear] = {
                    month: monthYear,
                    profit: 0,
                    sales: 0,
                    expenses: 0,
                    incomes: 0
                };
            }
            monthlyProfits[monthYear].expenses += expense.amount;
            monthlyProfits[monthYear].profit -= expense.amount;
        });

        // Add general incomes
        totalGeneralIncomes = filteredGeneralIncomes.reduce((sum, income) => sum + income.amount, 0);

        // Track general incomes by category
        filteredGeneralIncomes.forEach((income) => {
            const category = income.incomeCategory?.name || "Uncategorized";
            categoryIncomes[category] = (categoryIncomes[category] || 0) + income.amount;

            // Add to monthly data
            const monthYear = format(new Date(income.incomeDate), "MMM yyyy");
            if (!monthlyProfits[monthYear]) {
                monthlyProfits[monthYear] = {
                    month: monthYear,
                    profit: 0,
                    sales: 0,
                    expenses: 0,
                    incomes: 0
                };
            }
            monthlyProfits[monthYear].incomes += income.amount;
            monthlyProfits[monthYear].profit += income.amount;
        });

        // Calculate total expenses and total incomes
        const totalExpenses = totalPackageExpenses + totalGeneralExpenses;
        const totalIncomes = totalPackageIncomes + totalGeneralIncomes;

        // Calculate total profit including general expenses and incomes
        const totalProfit = totalSales - (totalPurchases + totalExpenses) + totalIncomes;

        // Convert monthly data to array and sort chronologically
        const monthlyProfitArray = Object.values(monthlyProfits).sort((a, b) =>
            parseISO(a.month).getTime() - parseISO(b.month).getTime()
        );

        // Prepare category expense data for pie chart
        const expenseCategoriesData = Object.entries(categoryExpenses).map(([name, value]) => ({
            name,
            value
        }));

        // Prepare category income data for pie chart
        const incomeCategoriesData = Object.entries(categoryIncomes).map(([name, value]) => ({
            name,
            value
        }));

        return {
            totalSales,
            totalPurchases,
            totalPackageExpenses,
            totalGeneralExpenses,
            totalExpenses,
            totalPackageIncomes,
            totalGeneralIncomes,
            totalIncomes,
            totalReceipts,
            totalPayments,
            totalProfit,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
            packageCount,
            profitablePackages,
            profitablePercentage: packageCount > 0 ? (profitablePackages / packageCount) * 100 : 0,
            monthlyProfits: monthlyProfitArray,
            expenseCategories: expenseCategoriesData,
            incomeCategories: incomeCategoriesData
        };
    }, [filteredData, filteredGeneralExpenses, filteredGeneralIncomes]);

    // Prepare data for the queries table with financial details for each package
    const queryFinancials = useMemo(() => {
        return filteredData.map(pkg => {
            const sales = pkg.saleDetails.reduce((sum: number, sale: any) => sum + sale.salePrice, 0);
            const purchases = pkg.purchaseDetails.reduce((sum: number, purchase: any) => sum + purchase.price, 0);
            const expenses = pkg.expenseDetails.reduce((sum: number, expense: any) => sum + expense.amount, 0);
            const incomes = pkg.incomeDetails.reduce((sum: number, income: any) => sum + income.amount, 0);
            const profit = sales - (purchases + expenses) + incomes;

            // Calculate percentage profit if sales > 0
            const profitMargin = sales > 0 ? ((profit / sales) * 100) : 0;

            return {
                id: pkg.id,
                name: pkg.tourPackageQueryName || 'Unnamed Package',
                location: pkg.location.label,
                date: new Date(pkg.createdAt),
                sales,
                purchases,
                expenses,
                incomes,
                profit,
                profitMargin
            };
        });
    }, [filteredData]);

    // Function to sort query financials data
    const sortedQueryFinancials = useMemo(() => {
        const sortableData = [...queryFinancials];
        sortableData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return sortableData;
    }, [queryFinancials, sortConfig]);

    // Function to handle sorting when column header is clicked
    const requestSort = (key: QueryFinancialKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Prepare chart colors
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Confirmed Queries Report Filters</CardTitle>
                    <CardDescription>Filter the profit report for confirmed queries by date range and location</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <label htmlFor="location" className="text-sm font-medium">Location</label>
                            <Select value={filterLocation} onValueChange={setFilterLocation}>
                                <SelectTrigger id="location">
                                    <SelectValue placeholder="Select Location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map(location => (
                                        <SelectItem key={location} value={location}>{location}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* From Date Picker */}
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="from-date">From Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="from-date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date?.from && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            format(date.from, "MMM dd, yyyy")
                                        ) : (
                                            <span>Select start date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date?.from}
                                        onSelect={handleFromDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* To Date Picker */}
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="to-date">To Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="to-date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date?.to && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.to ? (
                                            format(date.to, "MMM dd, yyyy")
                                        ) : (
                                            <span>Select end date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date?.to}
                                        onSelect={handleToDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-5 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="incomes">Incomes</TabsTrigger>
                    <TabsTrigger value="queries">Confirmed Queries</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <DollarSignIcon className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{(financialMetrics.totalSales + financialMetrics.totalIncomes).toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Sales: ₹{financialMetrics.totalSales.toFixed(2)} | Other Income: ₹{financialMetrics.totalIncomes.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
                                <DollarSignIcon className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{(financialMetrics.totalPurchases + financialMetrics.totalExpenses).toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Purchases: ₹{financialMetrics.totalPurchases.toFixed(2)} | Expenses: ₹{financialMetrics.totalExpenses.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                                <TrendingUpIcon className={cn("h-4 w-4", financialMetrics.totalProfit > 0 ? "text-green-500" : "text-red-500")} />
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", financialMetrics.totalProfit > 0 ? "text-green-500" : "text-red-500")}>
                                    ₹{financialMetrics.totalProfit.toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Profit Margin: {financialMetrics.profitMargin.toFixed(2)}%
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
                                <CalendarIcon className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{financialMetrics.packageCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Profitable: {financialMetrics.profitablePackages} ({financialMetrics.profitablePercentage.toFixed(1)}%)
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">General Finances</CardTitle>
                                <CalendarIcon className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">General Expenses:</span>
                                        <span className="text-red-500">₹{financialMetrics.totalGeneralExpenses.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">General Income:</span>
                                        <span className="text-green-500">₹{financialMetrics.totalGeneralIncomes.toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Profit Overview Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profit Overview</CardTitle>
                            <CardDescription>Sales vs Costs breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Revenue', value: financialMetrics.totalSales },
                                            { name: 'Purchases', value: financialMetrics.totalPurchases },
                                            { name: 'Expenses', value: financialMetrics.totalExpenses },
                                            { name: 'Profit', value: financialMetrics.totalProfit }
                                        ]}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]}
                                        />
                                        <Legend />
                                        <Bar dataKey="value" name="Amount (₹)" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Monthly Analysis Tab */}
                <TabsContent value="monthly">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Profit Trends</CardTitle>
                            <CardDescription>Profit trends over the selected time period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={financialMetrics.monthlyProfits}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]} />
                                        <Legend />
                                        <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Sales" />
                                        <Line type="monotone" dataKey="expenses" stroke="#ff7300" name="Expenses" />
                                        <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monthly Profit Table */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Monthly Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="p-2 text-left">Month</th>
                                            <th className="p-2 text-right">Sales (₹)</th>
                                            <th className="p-2 text-right">Expenses (₹)</th>
                                            <th className="p-2 text-right">Profit (₹)</th>
                                            <th className="p-2 text-right">Margin (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {financialMetrics.monthlyProfits.map((item, index) => (
                                            <tr key={index} className={index % 2 ? "bg-muted/30" : ""}>
                                                <td className="p-2">{item.month}</td>
                                                <td className="p-2 text-right">{item.sales.toFixed(2)}</td>
                                                <td className="p-2 text-right">{item.expenses.toFixed(2)}</td>
                                                <td className={cn("p-2 text-right font-medium", item.profit >= 0 ? "text-green-600" : "text-red-600")}>
                                                    {item.profit.toFixed(2)}
                                                </td>
                                                <td className="p-2 text-right">
                                                    {item.sales > 0 ? ((item.profit / item.sales) * 100).toFixed(2) : "0.00"}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted">
                                            <td className="p-2 font-bold">Total</td>
                                            <td className="p-2 text-right font-bold">{financialMetrics.totalSales.toFixed(2)}</td>
                                            <td className="p-2 text-right font-bold">{(financialMetrics.totalPurchases + financialMetrics.totalExpenses).toFixed(2)}</td>
                                            <td className={cn("p-2 text-right font-bold", financialMetrics.totalProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                                {financialMetrics.totalProfit.toFixed(2)}
                                            </td>
                                            <td className="p-2 text-right font-bold">{financialMetrics.profitMargin.toFixed(2)}%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Expense Categories Pie Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Expense Distribution</CardTitle>
                                <CardDescription>Breakdown of expenses by category</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={financialMetrics.expenseCategories}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={150}
                                                fill="#8884d8"
                                                dataKey="value"
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {financialMetrics.expenseCategories.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* General Expenses Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>General Expenses</CardTitle>
                                <CardDescription>Expenses not associated with any tour package</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-muted/50">
                                                <th className="p-2 text-left">Category</th>
                                                <th className="p-2 text-left">Date</th>
                                                <th className="p-2 text-right">Amount (₹)</th>
                                                <th className="p-2 text-left">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredGeneralExpenses
                                                .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
                                                .map((expense, index) => (
                                                    <tr key={expense.id} className={index % 2 ? "bg-muted/30" : ""}>
                                                        <td className="p-2">{expense.expenseCategory?.name || "Uncategorized"}</td>
                                                        <td className="p-2">{format(new Date(expense.expenseDate), "dd MMM yyyy")}</td>
                                                        <td className="p-2 text-right font-medium text-red-600">{expense.amount.toFixed(2)}</td>
                                                        <td className="p-2">{expense.description || "No description"}</td>
                                                    </tr>
                                                ))}
                                            {filteredGeneralExpenses.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                                        No general expenses found for the selected period
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted">
                                                <td className="p-2 font-bold" colSpan={2}>Total General Expenses</td>
                                                <td className="p-2 text-right font-bold text-red-600">
                                                    {financialMetrics.totalGeneralExpenses.toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* All Expense Categories Table */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>All Expense Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-muted/50">
                                                <th className="p-2 text-left">Category</th>
                                                <th className="p-2 text-right">Amount (₹)</th>
                                                <th className="p-2 text-right">Percentage</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {financialMetrics.expenseCategories
                                                .sort((a, b) => b.value - a.value)
                                                .map((category, index) => (
                                                    <tr key={index} className={index % 2 ? "bg-muted/30" : ""}>
                                                        <td className="p-2">{category.name}</td>
                                                        <td className="p-2 text-right">{category.value.toFixed(2)}</td>
                                                        <td className="p-2 text-right">
                                                            {((category.value / (financialMetrics.totalPurchases + financialMetrics.totalExpenses)) * 100).toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted">
                                            <td className="p-2 font-bold">Total</td>
                                            <td className="p-2 text-right font-bold">
                                                {(financialMetrics.totalPurchases + financialMetrics.totalExpenses).toFixed(2)}
                                            </td>
                                            <td className="p-2 text-right font-bold">100.00%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* Incomes Tab */}
            <TabsContent value="incomes">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Income Categories Pie Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Income Distribution</CardTitle>
                            <CardDescription>Breakdown of all incomes by category</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={financialMetrics.incomeCategories}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={150}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {financialMetrics.incomeCategories.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* General Incomes Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>General Income</CardTitle>
                            <CardDescription>Income not associated with any tour package</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="p-2 text-left">Category</th>
                                            <th className="p-2 text-left">Date</th>
                                            <th className="p-2 text-right">Amount (₹)</th>
                                            <th className="p-2 text-left">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredGeneralIncomes
                                            .sort((a, b) => new Date(b.incomeDate).getTime() - new Date(a.incomeDate).getTime())
                                            .map((income, index) => (
                                                <tr key={income.id} className={index % 2 ? "bg-muted/30" : ""}>
                                                    <td className="p-2">{income.incomeCategory?.name || "Uncategorized"}</td>
                                                    <td className="p-2">{format(new Date(income.incomeDate), "dd MMM yyyy")}</td>
                                                    <td className="p-2 text-right font-medium text-green-600">{income.amount.toFixed(2)}</td>
                                                    <td className="p-2">{income.description || "No description"}</td>
                                                </tr>
                                            ))}
                                        {filteredGeneralIncomes.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                                    No general income found for the selected period
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted">
                                            <td className="p-2 font-bold" colSpan={2}>Total General Income</td>
                                            <td className="p-2 text-right font-bold text-green-600">
                                                {financialMetrics.totalGeneralIncomes.toFixed(2)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Income Categories Table */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>All Income Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="p-2 text-left">Category</th>
                                            <th className="p-2 text-right">Amount (₹)</th>
                                            <th className="p-2 text-right">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {financialMetrics.incomeCategories
                                            .sort((a, b) => b.value - a.value)
                                            .map((category, index) => (
                                                <tr key={index} className={index % 2 ? "bg-muted/30" : ""}>
                                                    <td className="p-2">{category.name}</td>
                                                    <td className="p-2 text-right">{category.value.toFixed(2)}</td>
                                                    <td className="p-2 text-right">
                                                        {((category.value / financialMetrics.totalIncomes) * 100).toFixed(2)}%
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted">
                                            <td className="p-2 font-bold">Total</td>
                                            <td className="p-2 text-right font-bold">
                                                {financialMetrics.totalIncomes.toFixed(2)}
                                            </td>
                                            <td className="p-2 text-right font-bold">100.00%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* Queries Table Tab */}
            <TabsContent value="queries">
                <Card>
                    <CardHeader>
                        <CardTitle>Confirmed Tour Package Queries Financial Summary</CardTitle>
                        <CardDescription>
                            Detailed breakdown of financial metrics for confirmed tour package queries
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="p-2 text-left">Package Name</th>
                                        <th className="p-2 text-left">Location</th>
                                        <th className="p-2 text-left">Date</th>
                                        <th className="p-2 text-right cursor-pointer hover:bg-muted/70" onClick={() => requestSort('sales')}>
                                            Sales (₹)
                                            {sortConfig.key === 'sales' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                        <th className="p-2 text-right cursor-pointer hover:bg-muted/70" onClick={() => requestSort('purchases')}>
                                            Purchases (₹)
                                            {sortConfig.key === 'purchases' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                        <th className="p-2 text-right cursor-pointer hover:bg-muted/70" onClick={() => requestSort('expenses')}>
                                            Expenses (₹)
                                            {sortConfig.key === 'expenses' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                        <th className="p-2 text-right cursor-pointer hover:bg-muted/70" onClick={() => requestSort('incomes')}>
                                            Income (₹)
                                            {sortConfig.key === 'incomes' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                        <th className="p-2 text-right cursor-pointer hover:bg-muted/70" onClick={() => requestSort('profit')}>
                                            Profit (₹)
                                            {sortConfig.key === 'profit' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                        <th className="p-2 text-right cursor-pointer hover:bg-muted/70" onClick={() => requestSort('profitMargin')}>
                                            Margin (%)
                                            {sortConfig.key === 'profitMargin' && (
                                                <span className="ml-1">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedQueryFinancials.map((query, index) => (
                                        <tr key={query.id} className={index % 2 ? "bg-muted/30" : ""}>
                                            <td className="p-2">
                                                <a
                                                    href={`/fetchaccounts/${query.id}`}
                                                    className="text-blue-600 hover:underline font-medium"
                                                >
                                                    {query.name}
                                                </a>
                                            </td>
                                            <td className="p-2">{query.location}</td>
                                            <td className="p-2">{format(query.date, "dd MMM yyyy")}</td>
                                            <td className="p-2 text-right">{query.sales.toFixed(2)}</td>
                                            <td className="p-2 text-right">{query.purchases.toFixed(2)}</td>
                                            <td className="p-2 text-right">{query.expenses.toFixed(2)}</td>
                                            <td className="p-2 text-right">{query.incomes.toFixed(2)}</td>
                                            <td className={cn(
                                                "p-2 text-right font-medium",
                                                query.profit >= 0 ? "text-green-600" : "text-red-600"
                                            )}>
                                                {query.profit.toFixed(2)}
                                            </td>
                                            <td className={cn(
                                                "p-2 text-right",
                                                query.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                                            )}>
                                                {query.profitMargin.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                    {sortedQueryFinancials.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-4 text-center text-muted-foreground">
                                                No tour package queries found for the selected filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted">
                                        <td className="p-2 font-bold" colSpan={3}>Total</td>
                                        <td className="p-2 text-right font-bold">{financialMetrics.totalSales.toFixed(2)}</td>
                                        <td className="p-2 text-right font-bold">{financialMetrics.totalPurchases.toFixed(2)}</td>
                                        <td className="p-2 text-right font-bold">{financialMetrics.totalExpenses.toFixed(2)}</td>
                                        <td className="p-2 text-right font-bold">
                                            {queryFinancials.reduce((sum, q) => sum + q.incomes, 0).toFixed(2)}
                                        </td>
                                        <td className={cn(
                                            "p-2 text-right font-bold",
                                            financialMetrics.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {financialMetrics.totalProfit.toFixed(2)}
                                        </td>
                                        <td className={cn(
                                            "p-2 text-right font-bold",
                                            financialMetrics.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {financialMetrics.profitMargin.toFixed(2)}%
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
);
}
