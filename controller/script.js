// SHARED INITIAL DATABASE
const INITIAL_JOBS = [
    { id: 1, customer: 'Juan Dela Cruz', plateNo: 'KJH 123', serviceType: 'Full PMS', status: 'Pending', partsUsed: [] },
    { id: 2, customer: 'Maria Santos', plateNo: 'ABC 456', serviceType: 'Oil Change', status: 'In Progress', partsUsed: [{ name: 'Oil Filter', qty: 1 }] },
    { id: 3, customer: 'Pedro Reyes', plateNo: 'XYZ 789', serviceType: 'Brake Repair', status: 'Delayed', partsUsed: [] }, 
    { id: 4, customer: 'Sita Sharma', plateNo: 'MNO 012', serviceType: 'Tire Rotation', status: 'On Hold', partsUsed: [] }
];

const INITIAL_INVENTORY = {
    'Oil Filter': { stock: 4, reorderLevel: 5, price: 500.00, expDate: '2026-06-01' }, 
    'Brake Pad': { stock: 15, reorderLevel: 8, price: 1200.50, expDate: '2025-01-15' },
    'Spark Plug': { stock: 30, reorderLevel: 10, price: 150.00, expDate: '2027-10-10' },
    'Tire': { stock: 2, reorderLevel: 4, price: 4500.00, expDate: '2028-03-20' } 
};

// PERSISTENCE LOGIC
let jobs = [];
let inventory = {};
let nextJobId = 0; 

function loadData() {
    const savedJobs = localStorage.getItem('dsm_jobs');
    const savedInventory = localStorage.getItem('dsm_inventory');

    if (savedJobs) {
        jobs = JSON.parse(savedJobs);
        const highestId = jobs.reduce((max, job) => Math.max(max, job.id), 0);
        nextJobId = highestId + 1;
    } else {
        jobs = INITIAL_JOBS;
        nextJobId = INITIAL_JOBS.length + 1;
    }

    if (savedInventory) {
        inventory = JSON.parse(savedInventory);
    } else {
        inventory = INITIAL_INVENTORY;
    }
}

function saveData() {
    localStorage.setItem('dsm_jobs', JSON.stringify(jobs));
    localStorage.setItem('dsm_inventory', JSON.stringify(inventory));
}

function renderPartSelects() {
    const fdeskSelect = document.getElementById('partSelectFdesk');
    const mechanicSelect = document.getElementById('partSelect');

    [fdeskSelect, mechanicSelect].forEach(selectElement => {
        if (selectElement) {
            selectElement.innerHTML = '<option value="">-- Select Part --</option>'; 
            Object.keys(inventory).forEach(partName => {
                const option = document.createElement('option');
                option.value = partName;
                option.textContent = `${partName} (Stock: ${inventory[partName].stock})`;
                selectElement.appendChild(option);
            });
        }
    });
}

// LOGIN
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return; 

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset All Data';
    resetBtn.style.cssText = 'background-color: #E9222E; color: white; padding: 8px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;';
    resetBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to reset all data (jobs and inventory) to their initial state?')) {
            localStorage.removeItem('dsm_jobs');
            localStorage.removeItem('dsm_inventory');
            window.location.reload();
        }
    });
    loginForm.parentElement.appendChild(resetBtn);


    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginMessage = document.getElementById('loginMessage');

        if (username === 'frontdesk' && password === '123') {
            window.location.href = 'frontdesk_dashboard.html'; 
        } else if (username === 'mechanic' && password === '123') {
            window.location.href = 'mechanic_dashboard.html';
        } else if (username === 'owner' && password === '123') {
            window.location.href = 'owner_dashboard.html'; 
        } else {
            loginMessage.textContent = '❌ Incorrect username or password. Please try again.';
            loginMessage.style.display = 'block';
        }
    });
}


// FRONT DESK LOGIC
function initFrontDeskDashboard() {
    
    renderPartSelects(); 
    
    const newBookingModal = document.getElementById('bookingModal');
    if (!newBookingModal) return; 

    let requiredParts = []; 

    const bookingList = document.getElementById('bookingList');
    const totalArrivals = document.getElementById('totalArrivals');
    const delayedBookings = document.getElementById('delayedBookings');
    const jobDetailModal = document.getElementById('jobDetailModalFdesk');
    
    function openJobDetail(id) {
        const job = jobs.find(j => j.id === id);
        if (!job) return;

        document.getElementById('detailPlateNo').textContent = job.plateNo;
        document.getElementById('detailCustomerName').textContent = job.customer;
        document.getElementById('detailServiceType').textContent = job.serviceType;
        document.getElementById('detailJobStatus').textContent = job.status;
        document.getElementById('detailJobStatus').className = `status-badge status-${job.status.toLowerCase().replace(/\s/g, '-')}`;
        
        const detailPartsList = document.getElementById('detailPartsList');
        detailPartsList.innerHTML = '';
        if (job.partsUsed.length > 0) {
            const ul = document.createElement('ul');
            job.partsUsed.forEach(part => {
                const li = document.createElement('li');
                const partInStock = inventory[part.name]?.stock || 0;
                const feasibilityText = (partInStock >= part.qty) ? 'Feasible' : `Low Stock (Available: ${partInStock})`;
                li.innerHTML = `<span>${part.name} x ${part.qty}</span> 
                                <span style="font-size: 0.9em; color: ${(partInStock >= part.qty) ? '#19A554' : '#E9222E'};">${feasibilityText}</span>`;
                ul.appendChild(li);
            });
            detailPartsList.appendChild(ul);
        } else {
            detailPartsList.innerHTML = '<p>No parts logged for this job yet.</p>';
        }

        jobDetailModal.style.display = 'block';
    }


    // for updating the Front Desk Dashboard
    function updateDashboardView() {
        const activeJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Paid' && j.status !== 'Confirmed');
        const delayedJobs = jobs.filter(j => j.status === 'Delayed');
        
        totalArrivals.textContent = activeJobs.length;
        delayedBookings.textContent = delayedJobs.length;
        
        bookingList.innerHTML = '';
        if (activeJobs.length === 0) {
            bookingList.innerHTML = '<p style="grid-column: 1 / -1;">No active bookings in the queue.</p>';
            return;
        }
        
        activeJobs.forEach(job => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.dataset.jobId = job.id;
            jobCard.style.cursor = 'pointer'; 
            
            const statusClass = job.status.toLowerCase().replace(/\s/g, '-');
            jobCard.innerHTML = `
                <h4>${job.serviceType} for ${job.plateNo}</h4>
                <p>Customer: ${job.customer}</p>
                <p>Status: <span class="status-badge status-${statusClass}">${job.status}</span></p>
            `;
            jobCard.addEventListener('click', () => openJobDetail(job.id));
            bookingList.appendChild(jobCard);
        });
    }

    // New Booking
    const partSelect = document.getElementById('partSelectFdesk');
    const partQuantityInput = document.getElementById('partQuantityFdesk');
    const btnAddPart = document.getElementById('btnAddPartFdesk');
    const estimatePartsList = document.getElementById('estimatePartsList');
    const feasibilityAlert = document.getElementById('feasibilityAlert');
    const btnFinalizeBooking = document.getElementById('btnFinalizeBooking');
    
    // Renders parts in the new booking modal
    function renderRequiredParts() {
        estimatePartsList.innerHTML = '<h5>Estimate Details:</h5>';
        const ul = document.createElement('ul');
        let allFeasible = true;

        requiredParts.forEach(part => {
            const li = document.createElement('li');
            const partInStock = inventory[part.name]?.stock || 0;
            part.feasible = partInStock >= part.qty;

            li.innerHTML = `
                <span>${part.name} x ${part.qty}</span> 
                <span style="font-size: 0.9em; font-weight: bold; color: ${part.feasible ? '#19A554' : '#E9222E'};">
                    ${part.feasible ? 'Stock OK' : `Unavailable (Stock: ${partInStock})`}
                </span>
            `;
            ul.appendChild(li);
            if (!part.feasible) allFeasible = false;
        });
        estimatePartsList.appendChild(ul);
        return allFeasible;
    }

    btnAddPart.addEventListener('click', () => {
        const selectedPartName = partSelect.value;
        const quantity = parseInt(partQuantityInput.value);
        if (!selectedPartName || isNaN(quantity) || quantity <= 0) return;

        const partInStock = inventory[selectedPartName]?.stock || 0;
        let isFeasible = partInStock >= quantity;

        const existingPart = requiredParts.find(p => p.name === selectedPartName);
        if (existingPart) {
            let currentTotal = existingPart.qty + quantity;
            isFeasible = (partInStock >= currentTotal);
            existingPart.qty = currentTotal;
            existingPart.feasible = isFeasible;
        } else {
            requiredParts.push({ name: selectedPartName, qty: quantity, feasible: isFeasible });
        }

        const allFeasible = renderRequiredParts();
        
        if (!allFeasible) {
            feasibilityAlert.textContent = `STOCK UNAVAILABLE: This Booking will be flagged as 'Delayed'. Owner alerted.`;
            feasibilityAlert.style.display = 'block'; 
            btnFinalizeBooking.textContent = 'Finalize Booking (Status: Delayed)';
            btnFinalizeBooking.style.backgroundColor = '#E9222E'; 
        } else {
            feasibilityAlert.style.display = 'none'; 
            btnFinalizeBooking.textContent = 'Finalize Booking (Status: Pending)';
            btnFinalizeBooking.style.backgroundColor = '#19A554'; 
        }
    });

    btnFinalizeBooking.addEventListener('click', () => {
        const allFeasible = renderRequiredParts();
        const finalStatus = allFeasible ? 'Pending' : 'Delayed';
        const plateNo = document.getElementById('plateNo').value.trim() || `NEW JOB ${nextJobId}`;
        const custName = document.getElementById('custName').value.trim() || 'New Customer';

        jobs.push({
            id: nextJobId++,
            customer: custName,
            plateNo: plateNo,
            serviceType: document.getElementById('serviceType').value.trim() || 'General Service',
            status: finalStatus,
            partsUsed: requiredParts.map(p => ({name: p.name, qty: p.qty})) 
        });

        saveData(); 
        
        alert(`✅ Booking finalized for ${plateNo} with status: ${finalStatus}. Queue Updated.`);
        
        newBookingModal.style.display = 'none';
        requiredParts = [];
        updateDashboardView();
    });

    // Close listeners for both modals
    document.querySelector('#bookingModal .close-button').addEventListener('click', () => {
        newBookingModal.style.display = 'none';
        requiredParts = [];
    });
    
    document.querySelector('#jobDetailModalFdesk .close-button').addEventListener('click', () => {
        jobDetailModal.style.display = 'none';
    });

    updateDashboardView(); 
}


//MECHANIC DASHBOARD
function initMechanicDashboard() {
    renderPartSelects(); 

    const jobListContainer = document.getElementById('jobList');
    if (!jobListContainer) return;

    const jobDetailModal = document.getElementById('jobDetailModal');
    let currentJobId = null; 

    // Helper functions
    function updateModalStatus(status) {
        document.getElementById('modalJobStatus').textContent = status;
        document.getElementById('modalJobStatus').className = `status-badge status-${status.toLowerCase().replace(/\s/g, '-')}`;
    }
    
    function renderJobList() {
        jobListContainer.innerHTML = '';
        jobs.filter(j => j.status !== 'Completed').forEach(job => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.dataset.jobId = job.id;
            const statusClass = job.status.toLowerCase().replace(/\s/g, '-');
            jobCard.innerHTML = `
                <h4>Service for ${job.plateNo}</h4>
                <p><strong>Service:</strong> ${job.serviceType}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${statusClass}">${job.status}</span></p>
            `;
            jobCard.addEventListener('click', () => openJobDetail(job.id));
            jobListContainer.appendChild(jobCard);
        });
    }

    function renderLoggedParts(parts) {
        const loggedPartsList = document.getElementById('loggedPartsList');
        loggedPartsList.innerHTML = '<h5>Logged Parts:</h5>';
        if (parts.length === 0) {
            loggedPartsList.innerHTML += '<p>No parts logged yet.</p>';
            return;
        }
        const ul = document.createElement('ul');
        parts.forEach(part => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${part.name}</span> <span>x ${part.qty}</span>`;
            ul.appendChild(li);
        });
        loggedPartsList.appendChild(ul);
    }

    function openJobDetail(id) {
        currentJobId = id;
        const job = jobs.find(j => j.id === id);
        if (!job) return;

        document.getElementById('modalJobTitle').textContent = `Job Details: Service for ${job.plateNo}`;
        document.getElementById('modalCustomerName').textContent = job.customer;
        document.getElementById('modalPlateNo').textContent = job.plateNo;
        document.getElementById('modalServiceType').textContent = job.serviceType;
        updateModalStatus(job.status);
        renderLoggedParts(job.partsUsed);

        jobDetailModal.style.display = 'block';
    }
    
    function updateJobStatus(newStatus) {
        if (!currentJobId) return;
        const job = jobs.find(j => j.id === currentJobId);
        if (job) {
            job.status = newStatus;
            saveData(); 
            updateModalStatus(newStatus);
            alert(`Job status updated to '${newStatus}'. This is now reflected in the Front Desk and Owner views.`);
            renderJobList();
        }
    }

    // Real-time Inventory Deduction & Reorder Check
    document.getElementById('btnAddPart').addEventListener('click', () => {
        if (!currentJobId) return;

        const selectedPartName = document.getElementById('partSelect').value;
        const quantity = parseInt(document.getElementById('partQuantity').value);
        const stockAlertsDiv = document.getElementById('stockAlerts');

        if (!selectedPartName || isNaN(quantity) || quantity <= 0) return;

        const job = jobs.find(j => j.id === currentJobId);
        const item = inventory[selectedPartName]; 

        if (item) {
            if (item.stock >= quantity) {
                item.stock -= quantity;
                
                const existingPartIndex = job.partsUsed.findIndex(p => p.name === selectedPartName);
                if (existingPartIndex > -1) {
                    job.partsUsed[existingPartIndex].qty += quantity;
                } else {
                    job.partsUsed.push({ name: selectedPartName, qty: quantity });
                }
                renderLoggedParts(job.partsUsed);
                saveData(); 
                renderPartSelects();

                alert(`Part logged and ${quantity} deducted from stock. Current Stock: ${item.stock}`);

                if (item.stock <= item.reorderLevel) {
                    stockAlertsDiv.textContent = `🚨 Low Stock Alert: ${selectedPartName} is now ${item.stock}. Owner has been notified.`;
                    stockAlertsDiv.style.display = 'block';
                } else {
                    stockAlertsDiv.style.display = 'none';
                }

            } else {
                alert(`🚫 Insufficient Stock for ${selectedPartName}. Available: ${item.stock}. Cannot log part.`);
            }
        }
    });

    document.getElementById('btnStartJob').addEventListener('click', () => updateJobStatus('In Progress'));
    document.getElementById('btnOnHold').addEventListener('click', () => updateJobStatus('On Hold'));
    document.getElementById('btnCompleteJob').addEventListener('click', () => updateJobStatus('Completed'));
    document.querySelector('.close-button').addEventListener('click', () => {
        jobDetailModal.style.display = 'none';
        renderJobList();
    });

    renderJobList(); 
}


// OWNER DASHBOARD
function initOwnerDashboard() {
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    if (!inventoryTableBody) return; 

    const addItemForm = document.getElementById('addItemForm');
    const constraintMessage = document.getElementById('constraintMessage');
    
    const editItemModal = document.getElementById('editItemModal');
    const editItemForm = document.getElementById('editItemForm');
    const editConstraintMessage = document.getElementById('editConstraintMessage');


    function convertInventoryToArray() {
        return Object.keys(inventory).map(key => ({ ...inventory[key], name: key }));
    }

    function renderInventoryTable() {
        const inventoryArray = convertInventoryToArray();
        inventoryTableBody.innerHTML = '';
        
        inventoryArray.forEach(item => {
            const row = inventoryTableBody.insertRow();
            row.style.cursor = 'pointer'; 
            
            if (item.stock <= item.reorderLevel) {
                row.style.backgroundColor = '#fff3cd'; 
            }

            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.stock;
            row.insertCell().textContent = item.reorderLevel;
            row.insertCell().textContent = `₱${item.price.toFixed(2)}`;
            row.insertCell().textContent = item.expDate;

            row.addEventListener('click', () => openEditItemModal(item.name));
        });
    }
    

    function openEditItemModal(name) {
        const item = inventory[name];
        if (!item) return;

       
        document.getElementById('editItemOriginalName').value = name; 
        document.getElementById('editItemName').value = name;
        document.getElementById('editItemStock').value = item.stock;
        document.getElementById('editItemReorder').value = item.reorderLevel;
        document.getElementById('editItemPrice').value = item.price.toFixed(2);
        document.getElementById('editItemExpDate').value = item.expDate;
        editConstraintMessage.style.display = 'none';
        
        editItemModal.style.display = 'block';
    }


    function renderAlerts() {
        const alertList = document.getElementById('alertList');
        alertList.innerHTML = '';
        
        const lowStockItems = convertInventoryToArray().filter(item => item.stock <= item.reorderLevel);
        lowStockItems.forEach(item => {
            const li = document.createElement('li');
            li.style.color = '#E9222E';
            li.textContent = `🚨 Low Stock: ${item.name} is now ${item.stock}. Reorder level is ${item.reorderLevel}.`;
            alertList.appendChild(li);
        });

        const delayedJobs = jobs.filter(job => job.status === 'Delayed');
        delayedJobs.forEach(job => {
            const li = document.createElement('li');
            li.style.color = '#ff8800';
            li.textContent = `Booking Delayed: Parts unavailable for Plate ${job.plateNo}.`;
            alertList.appendChild(li);
        });
        
        const onHoldJobs = jobs.filter(job => job.status === 'On Hold');
        onHoldJobs.forEach(job => {
            const li = document.createElement('li');
            li.style.color = '#ff8800';
            li.textContent = `Job On Hold: ${job.serviceType} for ${job.plateNo} needs parts/attention.`;
            alertList.appendChild(li);
        });

        if (alertList.children.length === 0) {
            alertList.innerHTML = '<li>No critical alerts at this time.</li>';
        }
    }


    //Add New Item
    addItemForm.addEventListener('submit', (event) => {
        event.preventDefault();
        constraintMessage.style.display = 'none';

        const name = document.getElementById('itemName').value.trim();
        const stock = parseInt(document.getElementById('itemStock').value);
        const reorder = parseInt(document.getElementById('itemReorder').value);
        const price = parseFloat(document.getElementById('itemPrice').value);
        const expDate = document.getElementById('itemExpDate').value;
        
        let isValid = true;

        if (isNaN(price) || price <= 0) {
            constraintMessage.textContent = '❌ ERROR: Unit Price is a mandatory field and must be greater than zero.';
            constraintMessage.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            inventory[name] = { stock, reorderLevel: reorder, price, expDate };
            
            saveData(); 
            
            alert(`Item '${name}' successfully added! Inventory updated. It will now appear in the Front Desk and Mechanic dropdowns upon refresh.`);
            addItemForm.reset(); 
            document.getElementById('addItemModal').style.display = 'none';

            renderInventoryTable();
            renderAlerts(); 
        }
    });
    
    //Edit Item
    editItemForm.addEventListener('submit', (event) => {
        event.preventDefault();
        editConstraintMessage.style.display = 'none';
        
        const originalName = document.getElementById('editItemOriginalName').value;
        const newName = document.getElementById('editItemName').value.trim();
        const stock = parseInt(document.getElementById('editItemStock').value);
        const reorder = parseInt(document.getElementById('editItemReorder').value);
        const price = parseFloat(document.getElementById('editItemPrice').value);
        const expDate = document.getElementById('editItemExpDate').value;

        let isValid = true;
        
        if (isNaN(price) || price <= 0) {
            editConstraintMessage.textContent = 'ERROR: Unit Price is a mandatory field and must be greater than zero.';
            editConstraintMessage.style.display = 'block';
            isValid = false;
        }
        
        if (newName !== originalName && inventory[newName]) {
            editConstraintMessage.textContent = `ERROR: An item named '${newName}' already exists.`;
            editConstraintMessage.style.display = 'block';
            isValid = false;
        }

        if (isValid) {
            if (newName !== originalName) {
                delete inventory[originalName];
            }

            inventory[newName] = { stock, reorderLevel: reorder, price, expDate };
            
            saveData(); 
            
            alert(`Item '${newName}' successfully updated! Changes will reflect in other views upon refresh.`);
            editItemModal.style.display = 'none';

            renderInventoryTable();
            renderAlerts(); 
        }
    });
    
    document.querySelector('#editItemModal .close-button').addEventListener('click', () => {
        editItemModal.style.display = 'none';
    });



    renderInventoryTable();
    renderAlerts();
}


//Functions
document.addEventListener('DOMContentLoaded', () => {
    
    loadData(); 

  
    initLogin();
    initFrontDeskDashboard();
    initMechanicDashboard();
    initOwnerDashboard();
});