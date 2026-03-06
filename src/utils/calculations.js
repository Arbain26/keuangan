// Native JS implementation to avoid extra dependencies if simple
export const calculateStats = (transactions, referenceDate = new Date()) => {
    const now = new Date(referenceDate);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

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
            // Weekly: Last 7 days
            if (tDate >= oneWeekAgo && tDate <= now) {
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
            // Weekly: Last 7 days
            if (tDate >= oneWeekAgo && tDate <= now) {
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
