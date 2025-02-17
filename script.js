        // Previous JavaScript code remains unchanged
        let events = (() => {
            const storedData = localStorage.getItem('events');
            if (!storedData) return [];
            return decryptData(storedData);
        })() || [];

        function sanitizeInput(input) {
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
        }

        function addEvent() {
            const title = sanitizeInput(document.getElementById('title').value);
            const date = document.getElementById('date').value;
            const type = document.getElementById('type').value;
            const priority = document.getElementById('priority').value;
            const description = sanitizeInput(document.getElementById('description').value);
            const email = sanitizeInput(document.getElementById('email').value);
            const reminderTime = document.getElementById('reminderTime').value;

            // Validate inputs
            if (!title || !date) {
                alert('Please fill in at least the title and date!');
                return;
            }

            // Additional validation
            const allowedTypes = ['event', 'meeting', 'task', 'reminder'];
            const allowedPriorities = ['low', 'medium', 'high'];
            
            if (!allowedTypes.includes(type) || !allowedPriorities.includes(priority)) {
                alert('Invalid input detected');
                return;
            }

            if (email && !isValidEmail(email)) {
                alert('Please enter a valid email address!');
                return;
            }

            const eventDate = new Date(date);
            if (eventDate < new Date()) {
                alert('Please select a future date!');
                return;
            }

            const newEvent = {
                id: Date.now(),
                title,
                date,
                type,
                priority,
                description,
                email,
                reminderTime,
                notificationSent: false
            };

            events.push(newEvent);
            saveEvents();
            displayEvents();
            clearForm();
            scheduler.scheduleEvent(newEvent);
            showNotification('Event added successfully');
        }

        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function scheduleNotification(event) {
            if (!event.email) return;

            const eventDate = new Date(event.date);
            const reminderTime = parseInt(event.reminderTime);
            const notificationDate = new Date(eventDate.getTime() - (reminderTime * 60000));

            if (notificationDate > new Date()) {
                setTimeout(() => {
                    sendEmailNotification(event);
                }, notificationDate.getTime() - new Date().getTime());
            }
        }

        // Add CSRF token to email requests
        const csrfToken = Math.random().toString(36).substring(2);
        document.cookie = `csrf_token=${csrfToken}; SameSite=Strict; Secure`;

        // Add loading states and success/error notifications
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.setAttribute('role', 'alert');
            notification.setAttribute('aria-live', 'polite');
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        async function sendEmailNotification(event) {
            const button = document.querySelector(`[data-id="${event.id}"] .delete-btn`);
            button.disabled = true;
            button.textContent = 'Sending...';

            const templateParams = {
                to_email: event.email,
                event_title: event.title,
                event_date: new Date(event.date).toLocaleString(),
                event_type: event.type,
                event_description: event.description,
                csrf_token: csrfToken // Add CSRF token
            };

            try {
                const response = await emailjs.send(
                    CONFIG.EMAIL_SERVICE_ID, 
                    CONFIG.EMAIL_TEMPLATE_ID, 
                    templateParams,
                    CONFIG.EMAIL_PUBLIC_KEY
                );
                
                showNotification('Email sent successfully!');
                event.notificationSent = true;
                displayEvents();
            } catch (error) {
                console.error('Email sending failed:', error);
                showNotification('Failed to send notification email', 'error');
            } finally {
                button.disabled = false;
                button.textContent = 'Delete';
            }
        }

        // Rate limiting implementation
        const emailRateLimit = new Map(); // Store email timestamps

        function isRateLimited(email) {
            const now = Date.now();
            const lastSent = emailRateLimit.get(email) || 0;
            const RATE_LIMIT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

            if (now - lastSent < RATE_LIMIT_DURATION) {
                return true; // Rate limited
            }
            return false;
        }

        function trackEmailSent(email) {
            emailRateLimit.set(email, Date.now());
        }

        function deleteEvent(id) {
            if (confirm('Are you sure you want to delete this event?')) {
                events = events.filter(event => event.id !== id);
                saveEvents();
                displayEvents();
                showNotification('Event deleted successfully');
            }
        }

        function clearForm() {
            document.getElementById('title').value = '';
            document.getElementById('date').value = '';
            document.getElementById('type').value = 'event';
            document.getElementById('priority').value = 'low';
            document.getElementById('description').value = '';
            document.getElementById('email').value = '';
            document.getElementById('reminderTime').value = '30';
        }

        // Add debounce utility function
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Update filter function with debouncing
        const debouncedDisplayEvents = debounce(() => {
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

            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();
            
            filteredEvents.forEach(event => {
                const div = document.createElement('div');
                div.className = 'event-item';
                div.dataset.priority = event.priority;
                // Add ARIA attributes
                div.setAttribute('role', 'article');
                div.setAttribute('aria-label', `${event.type} - ${event.title}`);
                
                div.innerHTML = `
                    <h3 tabindex="0">${event.title}</h3>
                    <p><strong>Date:</strong> <span aria-label="Scheduled for ${new Date(event.date).toLocaleString()}">${new Date(event.date).toLocaleString()}</span></p>
                    <p><strong>Type:</strong> <span aria-label="Event type: ${event.type}">${event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span></p>
                    <p><strong>Priority:</strong> <span aria-label="Priority level: ${event.priority}">${event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}</span></p>
                    <p><strong>Description:</strong> <span aria-label="Description: ${event.description}">${event.description}</span></p>
                    ${event.email ? `<p><strong>Notification:</strong> <span aria-label="Notification ${event.notificationSent ? 'sent to' : 'pending for'} ${event.email}">${event.notificationSent ? 'Sent' : 'Pending'} to ${event.email}</span></p>` : ''}
                    <button class="delete-btn" 
                            data-id="${event.id}" 
                            onclick="deleteEvent(${event.id})"
                            aria-label="Delete ${event.title}"
                            role="button">Delete</button>
                `;
                fragment.appendChild(div);
            });

            eventsList.innerHTML = '';
            eventsList.appendChild(fragment);
        }, 250); // 250ms delay

        // Update the original filter function to use the debounced version
        function filterEvents() {
            debouncedDisplayEvents();
        }

        // Update displayEvents to use the same optimized rendering
        const displayEvents = debouncedDisplayEvents;

        // Replace the setInterval with a more efficient scheduling system
        class EventScheduler {
            constructor() {
                this.scheduledEvents = new Map();
            }

            scheduleEvent(event) {
                if (!event.email || event.notificationSent) return;

                const eventDate = new Date(event.date);
                const reminderTime = parseInt(event.reminderTime);
                const notificationDate = new Date(eventDate.getTime() - (reminderTime * 60000));
                
                if (notificationDate <= new Date()) {
                    sendEmailNotification(event);
                    return;
                }

                // Clear any existing timeout for this event
                if (this.scheduledEvents.has(event.id)) {
                    clearTimeout(this.scheduledEvents.get(event.id));
                }

                // Schedule new timeout
                const timeoutId = setTimeout(() => {
                    sendEmailNotification(event);
                    this.scheduledEvents.delete(event.id);
                }, notificationDate.getTime() - Date.now());

                this.scheduledEvents.set(event.id, timeoutId);
            }

            rescheduleAll(events) {
                // Clear all existing timeouts
                for (const timeoutId of this.scheduledEvents.values()) {
                    clearTimeout(timeoutId);
                }
                this.scheduledEvents.clear();

                // Schedule all events
                events.forEach(event => this.scheduleEvent(event));
            }
        }

        const scheduler = new EventScheduler();

        // Initialize scheduler when page loads
        scheduler.rescheduleAll(events);

        // Simple encryption/decryption functions
        function encryptData(data) {
            // In a production environment, use a proper encryption library
            return btoa(JSON.stringify(data));
        }

        function decryptData(encryptedData) {
            try {
                return JSON.parse(atob(encryptedData));
            } catch (e) {
                console.error('Failed to decrypt data');
                return [];
            }
        }

        // Update storage functions
        function saveEvents() {
            const encryptedData = encryptData(events);
            localStorage.setItem('events', encryptedData);
        }

        // Add form validation feedback
        function validateForm() {
            const title = document.getElementById('title').value;
            const date = document.getElementById('date').value;
            const email = document.getElementById('email').value;

            const titleError = document.getElementById('titleError');
            const dateError = document.getElementById('dateError');
            const emailError = document.getElementById('emailError');

            let isValid = true;

            // Reset error messages
            titleError.textContent = '';
            dateError.textContent = '';
            emailError.textContent = '';

            if (!title) {
                titleError.textContent = 'Title is required';
                isValid = false;
            }

            if (!date) {
                dateError.textContent = 'Date is required';
                isValid = false;
            } else if (new Date(date) < new Date()) {
                dateError.textContent = 'Please select a future date';
                isValid = false;
            }

            if (email && !isValidEmail(email)) {
                emailError.textContent = 'Please enter a valid email address';
                isValid = false;
            }

            return isValid;
        }

        // Add keyboard navigation support
        function addKeyboardNavigation() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.classList.contains('event-item')) {
                    // Toggle event details visibility
                    const details = e.target.querySelector('.event-details');
                    if (details) {
                        details.style.display = details.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
        }