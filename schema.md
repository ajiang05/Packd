# Packd - Database Schema

This document outlines the core relational database schema (PostgreSQL) required to support the Packd MVP features.

## 1. Core Entities

### `users`
Stores user authentication and profile data.
*   `id` (UUID, Primary Key)
*   `email` (VARCHAR, Unique, Not Null)
*   `password_hash` (VARCHAR, Not Null) - *Using Bcrypt as specified in project history*
*   `first_name` (VARCHAR, Not Null)
*   `last_name` (VARCHAR, Not Null)
*   `created_at` (TIMESTAMP, Default NOW())

### `trips`
The main entity representing a planned vacation.
*   `id` (UUID, Primary Key)
*   `creator_id` (UUID, Foreign Key -> `users.id`)
*   `title` (VARCHAR, Not Null) - e.g., "Miami Spring Break 2026"
*   `destination` (VARCHAR, Not Null)
*   `start_date` (DATE, Not Null)
*   `end_date` (DATE, Not Null)
*   `timezone` (VARCHAR, Not Null) - *Crucial for avoiding calendar conflicts*
*   `cover_image_url` (VARCHAR)
*   `created_at` (TIMESTAMP, Default NOW())

### `trip_members`
A join table connecting users to trips. All members have equal editing access.
*   `id` (UUID, Primary Key)
*   `trip_id` (UUID, Foreign Key -> `trips.id`, On Delete Cascade)
*   `user_id` (UUID, Foreign Key -> `users.id`, On Delete Cascade)
*   `joined_at` (TIMESTAMP, Default NOW())
*   *Unique Constraint: `(trip_id, user_id)` to prevent duplicate joins.*

---

## 2. Planning & Itinerary

### `activities`
Events added to the calendar by any trip member.
*   `id` (UUID, Primary Key)
*   `trip_id` (UUID, Foreign Key -> `trips.id`, On Delete Cascade)
*   `created_by` (UUID, Foreign Key -> `users.id`)
*   `title` (VARCHAR, Not Null)
*   `description` (TEXT)
*   `start_time` (TIMESTAMP WITH TIME ZONE, Not Null)
*   `end_time` (TIMESTAMP WITH TIME ZONE, Not Null)
*   `external_link` (VARCHAR) - e.g., Airbnb or restaurant link
*   `link_preview_image` (VARCHAR) - *Scraped image from the external link*
*   `created_at` (TIMESTAMP, Default NOW())

---

## 3. Logistics & Checklists

### `checklist_items`
Handles both shared group tasks and personal packing lists.
*   `id` (UUID, Primary Key)
*   `trip_id` (UUID, Foreign Key -> `trips.id`, On Delete Cascade)
*   `created_by` (UUID, Foreign Key -> `users.id`)
*   `title` (VARCHAR, Not Null)
*   `is_personal` (BOOLEAN, Default FALSE) - *If true, only visible to assigned_user*
*   `assigned_user_id` (UUID, Foreign Key -> `users.id`) - *Required if it's a shared task*
*   `is_completed` (BOOLEAN, Default FALSE)
*   `created_at` (TIMESTAMP, Default NOW())

---

## 4. In-App Price Splitter

### `expenses`
The overarching cost that someone paid for.
*   `id` (UUID, Primary Key)
*   `trip_id` (UUID, Foreign Key -> `trips.id`, On Delete Cascade)
*   `paid_by_user_id` (UUID, Foreign Key -> `users.id`) - *Who fronted the money*
*   `title` (VARCHAR, Not Null) - e.g., "Airbnb Booking"
*   `total_amount` (DECIMAL(10, 2), Not Null)
*   `created_at` (TIMESTAMP, Default NOW())

### `expense_splits`
How the overarching expense is divided among the group.
*   `id` (UUID, Primary Key)
*   `expense_id` (UUID, Foreign Key -> `expenses.id`, On Delete Cascade)
*   `user_id` (UUID, Foreign Key -> `users.id`) - *Who owes the money*
*   `amount_owed` (DECIMAL(10, 2), Not Null)
*   `is_settled` (BOOLEAN, Default FALSE) - *Turns true when they pay the person back*
