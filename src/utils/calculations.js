// Native JS implementation to avoid extra dependencies if simple
export const calculateStats = (transactions, referenceDate = new Date()) => {
    // For Month/Year stats, respect the selected referenceDate
    const refNow = new Date(referenceDate);
    const currentMonth = refNow.getMonth();
    const currentYear = refNow.getFullYear();

    // For Weekly stats, always use the real current date (last 7 days)
    const actualNow = new Date();
    actualNow.setHours(23, 59, 59, 999);
    const oneWeekAgo = new Date(actualNow);
    oneWeekAgo.setDate(actualNow.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    let weeklyExpense = 0;
    let monthlyExpense = 0;
    let yearlyExpense = 0;

    let weeklyIncome = 0;
    let monthlyIncome = 0;
    let yearlyIncome = 0;

    // For Chart: Monthly Data (Jan-Dec)
    const monthlyChartDataExpense = Array(12).fill(0);
    const monthlyChartDataIncome = Array(12).fill(0);

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const amount = Number(t.amount);

        // Yearly Check (Common for chart)
        const isThisYear = tDate.getFullYear() === currentYear;

        if (t.type === 'pengeluaran') {
            // Weekly: Last 7 days (relative to real today)
            if (tDate >= oneWeekAgo && tDate <= actualNow) {
                weeklyExpense += amount;
            }

            // Monthly: Current Month & Year
            if (tDate.getMonth() === currentMonth && isThisYear) {
                monthlyExpense += amount;
            }

            // Yearly
            if (isThisYear) {
                yearlyExpense += amount;
                monthlyChartDataExpense[tDate.getMonth()] += amount;
            }
        } else if (t.type === 'pemasukan') {
            // Weekly: Last 7 days (relative to real today)
            if (tDate >= oneWeekAgo && tDate <= actualNow) {
                weeklyIncome += amount;
            }

            // Monthly: Current Month & Year
            if (tDate.getMonth() === currentMonth && isThisYear) {
                monthlyIncome += amount;
            }

            // Yearly
            if (isThisYear) {
                yearlyIncome += amount;
                monthlyChartDataIncome[tDate.getMonth()] += amount;
            }
        }
    });

    return {
        weeklyExpense,
        monthlyExpense,
        yearlyExpense,
        weeklyIncome,
        monthlyIncome,
        yearlyIncome,
        monthlyChartDataExpense,
        monthlyChartDataIncome
    };
};
