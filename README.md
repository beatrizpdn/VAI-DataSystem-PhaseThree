# Van Alen Institute Public Art Impact Measurement System

## Project Overview
The Van Alen Institute, a nonprofit organization dedicated to inclusive urban design, is launching two community-led public art installations in Spring 2025. To measure the impact of these installations, a data collection application is being developed to facilitate real-time data gathering, survey inputs, and observational logging at installation sites. This system will provide automated data analysis, visualization tools, and reporting capabilities, allowing stakeholders to make data-driven decisions and advocate for further community-focused public art initiatives.

## Features
- **Real-time Data Collection**: Users can input survey responses and observational logs directly from installation sites.
- **Automated Data Analysis**: The system processes collected data to generate meaningful insights.
- **Visualization Tools**: Interactive charts and graphs for a clear representation of engagement metrics.
- **Reporting Capabilities**: Generate reports for stakeholders to assess project impact.
- **User-Friendly Interface**: Intuitive design for ease of use by community partners and researchers.

## Tech Stack
- **Frontend**: React
- **Backend**: Python Flask
- **Database**: Firestore (NoSQL)

## 📦 VAI DataSystem – Local Setup Instructions

### ✅ Prerequisites

Install the following tools:

* **Node.js and npm**

  * Recommended via Homebrew: [https://formulae.brew.sh/formula/node](https://formulae.brew.sh/formula/node)
  * Additional guide: [Install Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

* **Python 3 (latest)**

  * Download: [https://www.python.org/downloads/](https://www.python.org/downloads/)

* **Git**

  * Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)

You will also need:

* A **Google account** (for Firebase)
* A **GitHub account** (to fork and access the repository)

---

### 📁 Setting Up the Project Locally

#### 1. Fork and Clone the Repository

* Repository: [https://github.com/beatrizpdn/VAI-DataSystem-PhaseThree](https://github.com/beatrizpdn/VAI-DataSystem-PhaseThree)
* Click the **"Fork"** button in GitHub
* After forking, clone it:

  ```bash
  git clone git@github.com:your-username/VAI-DataSystem-PhaseThree.git
  cd VAI-DataSystem-PhaseThree
  ```

---

### 🌐 Frontend Setup

1. Open the project folder and go into the `frontend` folder.
2. Install the frontend packages:

   ```bash
   cd frontend
   npm install
   ```

3. In the `frontend` folder, make a copy of the file named `.env.example`.
4. Rename the copied file to `.env`.
5. Open the new `.env` file and paste in your Firebase web app values.

Use the following field names in `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5001
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

6. Start the frontend:

```bash
npm run dev
```

---

### 🔥 Firebase / Firestore Setup

#### 🔧 Video Guide (watch up to 3:35): [Firebase Setup Video](#)

#### 1. Create Firebase Project

* Go to: [Firebase Console](https://console.firebase.google.com)
* Project name: `VAI-DataSystem`
* Use default settings

#### 2. Set Up Firestore Database

* Navigate to **Build > Firestore Database**
* Click **Next**, select **Start in production mode**, then click **Create**

#### 3. Generate Service Account Key

* Go to **Project Settings > Service Accounts**
* Click **Generate new private key**
* A `.json` file will be downloaded
* Rename it to: `firebase_key.json`
* Move it into your backend directory:

  ```
  backend/app/firebase_key.json
  ```

#### 4. Enable Authentication

* Navigate to **Build > Authentication > Sign-in Method**
* Enable **Email/Password**
* Click **Save**

#### 5. Register the Web App

* Go to **Project Settings > Your Apps**
* Click the `</>` Web icon
* App name: `VAI-Web`
* Uncheck/Skip Firebase Hosting for now
* Copy the generated `firebaseConfig` object

#### 6. Add Firebase Values to the Frontend

* Paste the values from your Firebase web app into `frontend/.env`.
* The field names must match the template shown above.

---

### 🖥️ Backend Setup

1. Go into the `backend` folder:

   ```bash
   cd ../backend
   ```

2. Create and activate a Python virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the backend packages:

   ```bash
   pip install -r requirements.txt
   ```

4. In the `backend` folder, make a copy of the file named `.env.example`.
5. Rename the copied file to `.env`.
6. Confirm that `backend/.env` contains:

```env
FIREBASE_KEY_PATH=app/firebase_key.json
FRONTEND_URL=http://localhost:5173
```

7. Make sure your Firebase service account file is saved here:

```text
backend/app/firebase_key.json
```

8. Start the backend:

```bash
python3 run.py
```

The backend runs on port `5001`, so the frontend `.env` should keep:

```env
VITE_API_BASE_URL=http://127.0.0.1:5001
```

---

### ✅ Running the Full App Locally

* **Frontend**:

  ```bash
  cd frontend
  npm run dev
  ```

* **Backend**:

  ```bash
  cd backend
  source venv/bin/activate
  python3 run.py
  ```
