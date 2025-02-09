        // Using in-memory storage instead of localStorage
        let events = [];

        function addEvent() {
            const title = document.getElementById('title').value;
            const date = document.getElementById('date').value;
            const type = document.getElementById('type').value;
            const priority = document.getElementById('priority').value;
            const description = document.getElementById('description').value;

            if (!title || !date) {
                alert("Both Title and Date are required!");
                return;
            }

            const newEvent = {
                id: Date.now(),
                title,
                date,
                type,
                priority,
                description
            };

            events.push(newEvent);
            displayEvents();
            clearForm();
        }

        function deleteEvent(id) {
            events = events.filter(event => event.id !== id);
            displayEvents();
        }

        function clearForm() {
            document.getElementById('title').value = '';
            document.getElementById('date').value = '';
            document.getElementById('type').value = 'event';
            document.getElementById('priority').value = 'low';
            document.getElementById('description').value = '';
        }

        function filterEvents() {
            displayEvents();
        }

        function displayEvents() {
            const eventsList = document.getElementById('eventsList');
            const typeFilter = document.getElementById('typeFilter').value;
            const priorityFilter = document.getElementById('priorityFilter').value;

            let filteredEvents = events;

            if (typeFilter !== 'all') {
                filteredEvents = filteredEvents.filter(event => event.type === typeFilter);
            }

            if (priorityFilter !== 'all') {
                filteredEvents = filteredEvents.filter(event => event.priority === priorityFilter);
            }

            // Sort events by date
            filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

            eventsList.innerHTML = filteredEvents.map(event => `
                <div class="event-item">
                    <h3>${event.title}</h3>
                    <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                    <p><strong>Type:</strong> ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</p>
                    <p><strong>Priority:</strong> ${event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}</p>
                    <p><strong>Description:</strong> ${event.description}</p>
                    <button class="delete-btn" onclick="deleteEvent(${event.id})">Delete</button>
                </div>
            `).join('');
        }

        // Initial display
        displayEvents();