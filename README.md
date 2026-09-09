# MAUSAM Insight

Design and build a high-fidelity, modern, attractive, and interactive mobile app prototype for the IMD MAUSAM Personalized Homepage.

Core Concept

Create a personalized weather experience that does not replace official IMD weather information, but intelligently organizes and prioritizes the most relevant official weather information for each user based on their location, interests, preferences, weather conditions, and alerts.

The design should feel like a premium government weather application: trustworthy, clean, modern, highly visual, easy to understand, and suitable for an SIH hackathon prototype demonstration.

1. Personalized Home Screen

Create a dynamic homepage containing:

- Current location and weather

- Temperature and weather condition

- Personalized greeting

- Today's weather summary

- Hourly forecast

- 7-day forecast

- Rainfall information

- Humidity

- Wind speed and direction

- Important weather alerts

- Recommended weather information

- Quick-access weather cards

The homepage should automatically prioritize the most relevant cards according to the user's selected interests.

Example:

- Student → rain + travel + daily forecast

- Farmer → rainfall + humidity + agriculture-related information

- Traveller → destination weather + forecast + warnings

- General User → current weather + forecast + alerts

Add a small "Personalized for You" indicator to demonstrate personalization.

2. Interactive Weather Map — Main Feature

Create a highly interactive weather map occupying approximately 50% of the screen.

The remaining 50% should display detailed weather information for the selected location.

Map features:

- Interactive India map

- Search location

- Location markers

- Tap any location/city to select it

- Current location button

- Zoom controls

- Weather markers

- Weather condition indicators

- Alert indicators

- Map layer controls

Add weather layers:

- 🌧 Rainfall

- 🌡 Temperature

- 💨 Wind

- ⚠ Weather Alerts

When the user taps a location such as Hyderabad, Vijayawada, Chennai, Delhi, or Mumbai, dynamically update the lower details section with that location's weather.

3. Selected Location Details

The lower half of the map screen should dynamically show:

Selected Location

- City

- State

- Current temperature

- Weather condition

- Feels-like temperature

- Humidity

- Wind speed

- Wind direction

- Rainfall

- Cloud cover

- Weather warning status

Below this, show:

- Hourly forecast

- 7-day forecast

- Rain probability

- Weather trend

- Important warning

Make the lower section scrollable while keeping the map visible.

4. Smart Weather Alerts

Create a visually prominent alert system.

Alert levels:

- Normal

- Moderate

- Severe

- Extreme

Important alerts should automatically move toward the top of the homepage.

Examples:

- Heavy Rain

- Thunderstorm

- Cyclone

- Heat Wave

- Flood Warning

- Strong Wind

Use clear icons, labels, and visual hierarchy so users can understand an alert within seconds.

5. Personalization & Preferences

Create an onboarding/preferences screen where users can select:

- Location

- User type/persona

- Weather interests

- Preferred information

- Notification preferences

Allow users to select interests such as:

- Daily Weather

- Rainfall

- Temperature

- Travel

- Agriculture

- Air Quality

- Severe Weather Alerts

Use these preferences to change the order and visibility of homepage cards.

6. Modern UI/UX Design

Use a premium, clean, modern weather-app interface.

Design principles:

- Minimal clutter

- Large readable weather information

- Rounded cards

- Smooth animations

- Soft gradients

- Glassmorphism used subtly

- Modern typography

- Consistent spacing

- High-quality weather icons

- Clear visual hierarchy

- Accessible contrast

- Responsive layout

- Touch-friendly buttons

Use a sophisticated blue/white weather-inspired visual identity, with accent colors for different warning levels.

Avoid making the interface look like a generic weather app. It should look innovative, intelligent, trustworthy, and competition-ready.

7. Navigation

Create simple bottom navigation:

Home | Map | Forecast | Alerts | Profile

Home:

Personalized weather dashboard.

Map:

Interactive weather map with 50/50 map and details.

Forecast:

Hourly and 7-day forecasts.

Alerts:

All important weather warnings.

Profile:

Location, interests, preferences, and notification settings.

8. Prototype Interactions

Make the prototype highly interactive.

Demonstrate:

1. User opens the app.

2. User selects their interests/persona.

3. Personalized homepage is generated.

4. User opens the weather map.

5. User taps a city.

6. Weather details update instantly.

7. User changes map layer from Temperature → Rainfall → Wind → Alerts.

8. User opens an alert.

9. Alert details are displayed.

10. User changes preferences.

11. Homepage automatically changes its recommended cards.

Use smooth transitions and micro-interactions throughout the prototype.

9. Demo Personalization Scenario

Include realistic mock data for demonstration.

Example:

User A — Student

Prioritize:

- Current weather

- Rain probability

- Travel weather

- Daily forecast

- Severe alerts

User B — Farmer

Prioritize:

- Rainfall

- Humidity

- Temperature

- Wind

- Agriculture-related weather information

When the user changes persona, visibly change the homepage card priority to demonstrate the personalization engine.

10. Trust & Data

Clearly communicate that official IMD weather information remains the source of truth.

Add subtle UI text such as:

"Weather information powered by official IMD data."

Do not invent or modify official warnings. The prototype can use realistic mock data for demonstration.

11. Overall Visual Experience

The final prototype should look like a real next-generation version of the MAUSAM mobile application, combining:

Official Weather Data + Personalization + Interactive Map + Smart Alerts + Beautiful UI/UX

The final result should be:

- Attractive

- Professional

- Innovative

- Easy to navigate

- Mobile-first

- Hackathon-demo ready

- Presentation/PPT ready

- Easy for judges to understand within 30 seconds

Prioritize the interactive 50% map + 50% weather details experience as the signature feature of the application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7c20a350-95b0-4108-94fc-1cd1781c95d7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
