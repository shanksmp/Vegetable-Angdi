(async () => {
    try {
        console.log("Request inside");
        const response = await fetch("/orderHistory");
        if (response.ok) {
            const orders = await response.json(); // Parse the response as JSON
            let rowCount = 0;

            orders.forEach(order => {
                const buyerName = order.buyerName;
                const productName = order.pName;
                const category = order.category;
                const pricePerLb = order.price;
                const totalPrice = order.totalPrice;
                const quantity = order.quantity;
                const orderId = order._id;
                const status = order.status;

                // Adding data to table
                const table = document.getElementById("listing_data_history");
                const row = table.insertRow(rowCount++);
                row.setAttribute("data-key", orderId);

                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                const cell3 = row.insertCell(2);
                const cell4 = row.insertCell(3);
                const cell5 = row.insertCell(4);
                const cell6 = row.insertCell(5);
                const cell7 = row.insertCell(6);
                const cell8 = row.insertCell(7); // Add a new cell to show status of the order

                cell1.innerHTML = rowCount;
                cell2.innerHTML = buyerName;
                cell3.innerHTML = productName;
                cell4.innerHTML = category;
                cell5.innerHTML = pricePerLb;
                cell6.innerHTML = quantity;
                cell7.innerHTML = totalPrice;
                cell8.innerHTML = status;


            });
        } else {
            console.error("Failed to fetch data from the server");
        }


    } catch (error) {
        console.error("An error occurred:", error);
    }
})();



