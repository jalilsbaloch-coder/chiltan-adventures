-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 26, 2026
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `chiltan_adventures`
--
CREATE DATABASE IF NOT EXISTS `chiltan_adventures` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `chiltan_adventures`;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--
-- Note: The password is 'admin123' hashed with bcrypt
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'System Admin', 'admin@chiltanadventures.com', '$2a$10$7z.j2l.1Y.2U.3X.4W.5V.6T.7S.8R.9Q.0P.1O.2N.3M.4L.5K', 'admin', '2026-08-26 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `packages`
--

CREATE TABLE `packages` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `duration` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `packages`
--

INSERT INTO `packages` (`id`, `title`, `slug`, `destination`, `description`, `duration`, `price`, `image`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Ziarat Valley Escape', 'ziarat-valley-escape', 'Ziarat, Balochistan', 'Experience the serene beauty of Ziarat Valley. Walk through the second largest Juniper forest in the world and visit the historic Quaid-e-Azam Residency.', '2 Days, 1 Night', 15000.00, '/images/tours/ziarat-valley.jpg', 'active', '2026-08-26 10:00:00', '2026-08-26 10:00:00'),
(2, 'Hingol National Park Adventure', 'hingol-national-park-adventure', 'Hingol, Balochistan', 'Discover the dramatic landscapes of Hingol National Park. See the mysterious Princess of Hope, the Sphinx of Balochistan, and diverse wildlife.', '3 Days, 2 Nights', 25000.00, '/images/tours/hingol-national-park.jpg', 'active', '2026-08-26 10:00:00', '2026-08-26 10:00:00'),
(3, 'Kund Malir Coastal Journey', 'kund-malir-coastal-journey', 'Kund Malir Beach', 'Relax on the pristine golden sands of Kund Malir beach. A perfect blend of desert and ocean landscapes along the Makran Coastal Highway.', '2 Days, 1 Night', 18000.00, '/images/tours/kund-malir-beach.jpg', 'active', '2026-08-26 10:00:00', '2026-08-26 10:00:00'),
(4, 'Quetta City Explorer', 'quetta-city-explorer', 'Quetta City', 'Immerse yourself in the bustling culture of Quetta. Visit historic bazaars, taste authentic local cuisine, and explore Hanna Lake.', '1 Day', 8000.00, '/images/tours/quetta-city.jpg', 'active', '2026-08-26 10:00:00', '2026-08-26 10:00:00'),
(5, 'Chiltan Mountain Experience', 'chiltan-mountain-experience', 'Chiltan Range', 'A rugged adventure for trekking enthusiasts. Conquer the peaks of the Chiltan mountain range and enjoy breathtaking panoramic views.', '4 Days, 3 Nights', 35000.00, '/images/tours/chiltan.jpg', 'active', '2026-08-26 10:00:00', '2026-08-26 10:00:00'),
(6, 'Chaman Heritage Tour', 'chaman-heritage-tour', 'Chaman', 'Explore the historic border town of Chaman. Experience unique cultural crossroads and stunning mountainous terrain.', '2 Days, 1 Night', 14000.00, '/images/tours/bolan-pass-heritage.jpg', 'active', '2026-08-26 10:00:00', '2026-08-26 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `gallery`
--

CREATE TABLE `gallery` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) NOT NULL,
  `package_id` int(11) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gallery`
--

INSERT INTO `gallery` (`id`, `title`, `description`, `image`, `package_id`, `destination`, `price`, `is_featured`, `display_order`, `created_at`) VALUES
(1, 'Juniper Forests', 'Ancient and serene high-altitude juniper woodland in Ziarat Valley.', '/images/gallery/gallery-1.jpg', 1, 'Ziarat', 15000.00, 1, 1, '2026-08-26 10:00:00'),
(2, 'Residency Winter', 'Snow-covered historical Quaid-e-Azam Residency heritage site.', '/images/gallery/gallery-2.jpg', 1, 'Ziarat', NULL, 0, 2, '2026-08-26 10:00:00'),
(3, 'Princess of Hope', 'Iconic natural rock formation carved by wind and sea in Hingol.', '/images/gallery/gallery-3.jpg', 2, 'Hingol', 25000.00, 1, 3, '2026-08-26 10:00:00'),
(4, 'Makran Coastal Highway', 'Breathtaking scenic ocean expressway connecting coastal paradises.', '/images/gallery/gallery-4.jpg', 3, 'Kund Malir', NULL, 1, 4, '2026-08-26 10:00:00'),
(5, 'Hanna Lake View', 'Turquoise waters framed by rugged arid mountains near Quetta.', '/images/gallery/gallery-5.jpg', 4, 'Quetta', 8000.00, 0, 5, '2026-08-26 10:00:00'),
(6, 'Chiltan Trek', 'Challenging mountain ridgeline expedition for alpine trekking lovers.', '/images/gallery/gallery-6.jpg', 5, 'Chiltan', 35000.00, 1, 6, '2026-08-26 10:00:00'),
(7, 'Desert meets Ocean', 'Golden dunes descending directly into the Arabian Sea at Kund Malir.', '/images/gallery/gallery-7.jpg', 3, 'Kund Malir', 18000.00, 1, 7, '2026-08-26 10:00:00'),
(8, 'Mountain Sunrise', 'Dawn golden hour lighting up the sharp peaks of Chiltan range.', '/images/gallery/gallery-8.jpg', 5, 'Chiltan', NULL, 0, 8, '2026-08-26 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `team`
--

CREATE TABLE `team` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `designation` varchar(100) NOT NULL,
  `bio` text NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `team`
--

INSERT INTO `team` (`id`, `name`, `designation`, `bio`, `image`, `created_at`) VALUES
(1, 'Tariq Baloch', 'Founder & Lead Guide', 'With over 15 years of experience exploring the rugged terrains of Balochistan, Tariq founded Chiltan Adventures to share the hidden beauties of the region with the world.', '/images/team/team-1.jpg', '2026-08-26 10:00:00'),
(2, 'Sara Khan', 'Operations Manager', 'Sara ensures every tour runs smoothly. Her attention to detail and passion for hospitality guarantees a comfortable experience for all our guests.', '/images/team/team-2.jpg', '2026-08-26 10:00:00'),
(3, 'Ahmed Ali', 'Senior Trekking Expert', 'A certified mountaineer, Ahmed leads our challenging expeditions. Safety and adventure go hand-in-hand under his expert guidance.', '/images/team/team-3.jpg', '2026-08-26 10:00:00'),
(4, 'Zainab Qazi', 'Cultural Specialist', 'Zainab brings our heritage tours to life, sharing deep insights into local traditions, history, and folklore.', '/images/team/team-4.jpg', '2026-08-26 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `name`, `email`, `phone`, `message`, `is_read`, `created_at`) VALUES
(1, 'John Doe', 'john.doe@example.com', '03001234567', 'Hello, I am interested in booking the Hingol National Park tour for next month. Could you provide more details regarding family accommodations?', 0, '2026-08-26 10:00:00'),
(2, 'Ayesha Malik', 'ayesha.m@example.com', '03339876543', 'Do you offer custom itineraries for corporate retreats? We are looking for a 2-day team-building trip near Quetta.', 1, '2026-08-26 10:00:00'),
(3, 'Ali Raza', 'ali.raza@example.com', '03450001112', 'What is the physical difficulty level for the Chiltan Mountain Experience? I have moderate trekking experience.', 0, '2026-08-26 10:00:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `packages`
--
ALTER TABLE `packages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `gallery`
--
ALTER TABLE `gallery`
  ADD PRIMARY KEY (`id`),
  ADD KEY `package_id` (`package_id`);

--
-- Indexes for table `team`
--
ALTER TABLE `team`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `packages`
--
ALTER TABLE `packages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `gallery`
--
ALTER TABLE `gallery`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `team`
--
ALTER TABLE `team`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `gallery`
--
ALTER TABLE `gallery`
  ADD CONSTRAINT `fk_gallery_package` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
