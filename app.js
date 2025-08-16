let mediaFiles = [];

// Fetch videos from backend
async function fetchVideos() {
	try {
		const response = await fetch('http://localhost:8080/api/media');
		const data = await response.json();
		mediaFiles = data.media_files || [];
		renderVideoGrid();
	} catch (error) {
		console.error('Error fetching videos:', error);
		// Fallback to empty grid if backend is not available
		renderVideoGrid();
	}
}

// Kid-friendly title generator
function generateKidFriendlyTitle() {
	const adjectives = [
		'Happy', 'Funny', 'Silly', 'Magic', 'Rainbow', 'Sunny', 'Bouncy', 'Giggly', 'Sparkly', 'Cheerful',
		'Playful', 'Colorful', 'Friendly', 'Jolly', 'Sweet', 'Brave', 'Kind', 'Gentle', 'Amazing', 'Wonder',
		'Super', 'Big', 'Little', 'Tiny', 'Cute', 'Adorable', 'Awesome', 'Cool', 'Fun', 'Nice'
	];

	const characters = [
		'Bunny', 'Puppy', 'Kitten', 'Bear', 'Elephant', 'Lion', 'Tiger', 'Monkey', 'Panda', 'Giraffe',
		'Dinosaur', 'Dragon', 'Unicorn', 'Princess', 'Prince', 'Fairy', 'Robot', 'Superhero', 'Pirate', 'Cowboy',
		'Frog', 'Duck', 'Owl', 'Butterfly', 'Ladybug', 'Fish', 'Dolphin', 'Whale', 'Octopus', 'Starfish'
	];

	const actions = [
		'Adventure', 'Dance Party', 'Song Time', 'Playground Fun', 'Learning Games', 'Counting Fun', 'ABC Time',
		'Color Quest', 'Shape Safari', 'Music Time', 'Story Hour', 'Bedtime Tales', 'Morning Songs', 'Playtime',
		'Friendship', 'Birthday Party', 'Picnic Day', 'Beach Fun', 'Snow Day', 'Garden Party', 'Tea Time',
		'Hide and Seek', 'Treasure Hunt', 'Magic Show', 'Circus Fun', 'Space Journey', 'Ocean Adventure'
	];

	const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
	const randomAction = actions[Math.floor(Math.random() * actions.length)];

	// Generate different title formats
	const formats = [
		`${randomAdjective} ${randomCharacter} ${randomAction}`,
		`${randomCharacter}'s ${randomAdjective} ${randomAction}`,
		`The ${randomAdjective} ${randomCharacter}`,
		`${randomAction} with ${randomCharacter}`,
		`${randomAdjective} ${randomAction} Time`,
		`${randomCharacter} and the ${randomAdjective} ${randomAction}`
	];

	return formats[Math.floor(Math.random() * formats.length)];
}

// Update video count display
function updateVideoCount() {
	const videoCountElement = document.getElementById('videoCount');
	const badVideosBtn = document.getElementById('badVideosBtn');

	const videosWithThumbs = mediaFiles.filter(media => media.has_thumb && media.thumb_path);
	const videosWithoutThumbs = mediaFiles.filter(media => !media.has_thumb || !media.thumb_path);

	if (mediaFiles.length === 0) {
		videoCountElement.textContent = 'No videos found';
	} else {
		videoCountElement.textContent = `${videosWithThumbs.length} videos available`;
	}

	// Show/hide bad videos button
	if (videosWithoutThumbs.length > 0) {
		badVideosBtn.style.display = 'inline-block';
		badVideosBtn.textContent = `🚫 BAD VIDEOS (${videosWithoutThumbs.length})`;
	} else {
		badVideosBtn.style.display = 'none';
	}
}


// Global variables for filtering
let currentMainFilter = 'all';
let videosByMainCategory = {};

// Create main page category navigation
function createMainCategoryNavigation() {
	// Group videos with thumbnails by folder
	const videosWithThumbs = mediaFiles.filter(media => media.has_thumb && media.thumb_path);

	videosByMainCategory = { 'all': videosWithThumbs };

	videosWithThumbs.forEach(media => {
		// Extract folder name from path
		const pathParts = media.video_path.split('/');
		const folderName = pathParts[pathParts.length - 2] || 'Unknown';

		if (!videosByMainCategory[folderName]) {
			videosByMainCategory[folderName] = [];
		}
		videosByMainCategory[folderName].push(media);
	});

	// Create category buttons
	const categoryButtons = document.getElementById('mainCategoryButtons');
	const categoryNav = document.getElementById('mainCategoryNav');

	if (Object.keys(videosByMainCategory).length > 2) { // More than just 'all' and one category
		categoryButtons.innerHTML = '';

		// Add "All" button first
		const allButton = document.createElement('div');
		allButton.className = 'main-category-btn active';
		allButton.textContent = `All (${videosByMainCategory['all'].length})`;
		allButton.onclick = () => filterMainVideos('all');
		categoryButtons.appendChild(allButton);

		// Add category buttons
		Object.keys(videosByMainCategory)
			.filter(category => category !== 'all')
			.sort()
			.forEach(category => {
				const button = document.createElement('div');
				button.className = 'main-category-btn';
				button.textContent = `${category} (${videosByMainCategory[category].length})`;
				button.onclick = () => filterMainVideos(category);
				button.dataset.category = category;
				categoryButtons.appendChild(button);
			});

		categoryNav.style.display = 'block';
	} else {
		categoryNav.style.display = 'none';
	}
}

// Filter main page videos by category
function filterMainVideos(category) {
	currentMainFilter = category;
	renderVideoGrid(category);

	// Update active button
	const buttons = document.querySelectorAll('.main-category-btn');
	buttons.forEach(btn => btn.classList.remove('active'));

	if (category === 'all') {
		const allButton = buttons[0]; // First button is always "All"
		if (allButton) allButton.classList.add('active');
	} else {
		const categoryButton = document.querySelector(`[data-category="${category}"]`);
		if (categoryButton) categoryButton.classList.add('active');
	}
}

// Render video grid from fetched data
function renderVideoGrid(filterCategory = 'all') {
	const videoGrid = document.querySelector('.video-grid');
	videoGrid.innerHTML = '';

	// Separate videos with and without thumbnails
	const videosWithThumbs = mediaFiles.filter(media => media.has_thumb && media.thumb_path);
	const videosWithoutThumbs = mediaFiles.filter(media => !media.has_thumb || !media.thumb_path);

	// Update the video count display
	updateVideoCount();

	// Create category navigation if not exists
	if (Object.keys(videosByMainCategory).length === 0) {
		createMainCategoryNavigation();
	}

	// Filter videos based on category
	let videosToShow = videosWithThumbs;
	if (filterCategory !== 'all' && videosByMainCategory[filterCategory]) {
		videosToShow = videosByMainCategory[filterCategory];
	}

	// Only show filtered videos with thumbnails in the main grid
	videosToShow.forEach(async (media, index) => {
		const kidFriendlyTitle = generateKidFriendlyTitle();
		const videoCard = document.createElement('div');
		videoCard.className = 'video-card';
		videoCard.onclick = () => playVideo(media.video_path, kidFriendlyTitle);

		const thumbnailUrl = `http://localhost:8080/${media.thumb_path}`;

		// Extract category for display
		const pathParts = media.video_path.split('/');
		const category = pathParts[pathParts.length - 2] || 'Unknown';

		videoCard.innerHTML = `
			<div class="video-number">${index + 1}</div>
			<div class="video-thumbnail" style="background-image: url('${thumbnailUrl}'); display: flex; align-items: center; justify-content: center;">
				<div class="duration-badge">3:45</div>
				<div class="video-options" onclick="event.stopPropagation(); showVideoOptions('${media.video_path}', '${kidFriendlyTitle}')">⋮</div>
			</div>
			<div class="video-title">${kidFriendlyTitle}</div>
		`;

		videoGrid.appendChild(videoCard);
	});

	// Store videos without thumbnails for the "bad videos" section
	window.videosWithoutThumbs = videosWithoutThumbs;
}

// Make filter function globally available
window.filterMainVideos = filterMainVideos;

// Generate random videos for sidebar
function populateVideoSidebar(currentVideoPath) {
	const sidebarVideoList = document.getElementById('sidebarVideoList');
	sidebarVideoList.innerHTML = '';

	// Filter out current video and only use videos with thumbnails
	const availableVideos = mediaFiles.filter(media =>
		media.video_path !== currentVideoPath &&
		media.has_thumb &&
		media.thumb_path
	);
	const shuffled = [...availableVideos].sort(() => Math.random() - 0.5);
	const randomVideos = shuffled.slice(0, 20);

	randomVideos.forEach(media => {
		const sidebarCard = document.createElement('div');
		sidebarCard.className = 'sidebar-video-card';
		const sidebarKidTitle = generateKidFriendlyTitle();
		sidebarCard.onclick = () => playVideo(media.video_path, sidebarKidTitle);

		const thumbnailUrl = `http://localhost:8080/${media.thumb_path}`;

		sidebarCard.innerHTML = `
			<div class="sidebar-thumbnail" style="background-image: url('${thumbnailUrl}');"></div>
			<div class="sidebar-video-title">${sidebarKidTitle}</div>
		`;

		sidebarVideoList.appendChild(sidebarCard);
	});
}

function playVideo(videoPath, title) {
	const videoPlayer = document.getElementById('videoPlayer');
	const videoElement = document.getElementById('videoElement');
	const videoSource = document.getElementById('videoSource');
	const videoTitle = document.getElementById('videoTitle');
	const mainContent = document.querySelector('.main-content');
	const sidebar = document.querySelector('.sidebar');
	const videoGridContainer = document.querySelector('.video-grid-container');
	const floatingShapes = document.querySelector('.floating-shapes');

	videoSource.src = `http://localhost:8080/${videoPath}`;
	videoTitle.textContent = title;

	// Create random video effects for this video
	createVideoEffects();

	// Load the video
	videoElement.load();

	// Populate sidebar with random videos
	populateVideoSidebar(videoPath);

	// Hide main content and show video player (keep top bar visible)
	mainContent.style.display = 'none';
	sidebar.style.display = 'none';
	videoGridContainer.style.display = 'none';
	floatingShapes.style.display = 'none';
	videoPlayer.style.display = 'block';

	// Play video when it's loaded
	videoElement.onloadeddata = function () {
		videoElement.play();
	};

	// Handle video load errors
	videoElement.onerror = function () {
		alert(`Error loading video: ${title}\n\nMake sure your local server is running at:\n${videoSource.src}`);
		closeVideo();
	};
}

function closeVideo() {
	const videoPlayer = document.getElementById('videoPlayer');
	const videoElement = document.getElementById('videoElement');
	const mainContent = document.querySelector('.main-content');
	const sidebar = document.querySelector('.sidebar');
	const videoGridContainer = document.querySelector('.video-grid-container');
	const floatingShapes = document.querySelector('.floating-shapes');

	// Pause and reset video
	videoElement.pause();
	videoElement.currentTime = 0;

	// Hide video player and show main content
	videoPlayer.style.display = 'none';
	mainContent.style.display = 'block';
	sidebar.style.display = 'none';
	videoGridContainer.style.display = 'flex';
	floatingShapes.style.display = 'block';
}

function goBack() {
	const videoPlayer = document.getElementById('videoPlayer');
	// If video player is visible, close it; otherwise do nothing
	if (videoPlayer.style.display === 'block') {
		closeVideo();
	}
}

// Close video with Escape key
document.addEventListener('keydown', function (e) {
	if (e.key === 'Escape') {
		const videoPlayer = document.getElementById('videoPlayer');
		if (videoPlayer.style.display === 'block') {
			closeVideo();
		}
	}
});

// Show video options menu
function showVideoOptions(videoPath, title) {
	const videoUrl = `http://localhost:8080/${videoPath}`;

	// Create download options modal
	const modal = document.createElement('div');
	modal.className = 'options-modal';
	modal.innerHTML = `
		<div class="options-content">
			<h3>${title}</h3>
			<div class="option-item" onclick="downloadVideo('${videoUrl}', '${videoPath.split('/').pop()}')">
				📥 Download Video
			</div>
			<div class="option-item" onclick="copyVideoLink('${videoUrl}')">
				🔗 Copy Link
			</div>
			<div class="option-item close-option" onclick="closeOptionsModal()">
				❌ Close
			</div>
		</div>
	`;

	// Add modal styles
	modal.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	`;

	const content = modal.querySelector('.options-content');
	content.style.cssText = `
		background: white;
		padding: 20px;
		border-radius: 10px;
		min-width: 250px;
		text-align: center;
	`;

	const items = modal.querySelectorAll('.option-item');
	items.forEach(item => {
		item.style.cssText = `
			padding: 12px;
			margin: 8px 0;
			background: #f0f0f0;
			border-radius: 5px;
			cursor: pointer;
			transition: background 0.2s;
		`;
		item.addEventListener('mouseenter', () => item.style.background = '#e0e0e0');
		item.addEventListener('mouseleave', () => item.style.background = '#f0f0f0');
	});

	document.body.appendChild(modal);
}

// Download video function
function downloadVideo(videoUrl, fileName) {
	const a = document.createElement('a');
	a.href = videoUrl;
	a.download = fileName;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	closeOptionsModal();
}

// Copy video link to clipboard
function copyVideoLink(videoUrl) {
	navigator.clipboard.writeText(videoUrl).then(() => {
		alert('Video link copied to clipboard!');
	}).catch(err => {
		console.error('Failed to copy link:', err);
		// Fallback for older browsers
		const textArea = document.createElement('textarea');
		textArea.value = videoUrl;
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand('copy');
		document.body.removeChild(textArea);
		alert('Video link copied to clipboard!');
	});
	closeOptionsModal();
}

// Close options modal
function closeOptionsModal() {
	const modal = document.querySelector('.options-modal');
	if (modal) {
		document.body.removeChild(modal);
	}
}

// Apply theme based on stored preference (default: night)
function applyTheme() {
	const savedTheme = localStorage.getItem('theme');
	const isNight = savedTheme ? savedTheme === 'night' : true; // Default to night

	if (isNight) {
		document.body.classList.add('night-theme');
		updateToggleButton(false); // false = night theme
	} else {
		document.body.classList.remove('night-theme');
		updateToggleButton(true); // true = day theme
	}
}

// Toggle between day and night themes
function toggleTheme() {
	const isCurrentlyNight = document.body.classList.contains('night-theme');

	if (isCurrentlyNight) {
		// Switch to day
		document.body.classList.remove('night-theme');
		localStorage.setItem('theme', 'day');
		updateToggleButton(true);
	} else {
		// Switch to night
		document.body.classList.add('night-theme');
		localStorage.setItem('theme', 'night');
		updateToggleButton(false);
	}
}

// Update the toggle button icon and appearance
function updateToggleButton(isDayTheme) {
	const toggleButton = document.getElementById('themeToggle');
	if (toggleButton) {
		toggleButton.textContent = isDayTheme ? '🌙' : '☀️';
		toggleButton.title = isDayTheme ? 'Switch to Night Theme' : 'Switch to Day Theme';
	}
}

// Make toggleTheme available globally
window.toggleTheme = toggleTheme;

// Create random video effects
function createVideoEffects() {
	const effectsContainer = document.getElementById('videoEffects');
	effectsContainer.innerHTML = ''; // Clear existing effects

	// Create 2 rainbows in safe zones (corners, not covering center)
	const rainbow1 = document.createElement('div');
	rainbow1.className = 'rainbow rainbow-1';
	rainbow1.style.top = '5%';
	rainbow1.style.left = '5%';
	rainbow1.style.animationDelay = '0s';
	effectsContainer.appendChild(rainbow1);

	const rainbow2 = document.createElement('div');
	rainbow2.className = 'rainbow rainbow-2';
	rainbow2.style.top = '10%';
	rainbow2.style.right = '5%';
	rainbow2.style.animationDelay = '1s';
	effectsContainer.appendChild(rainbow2);

	// Create corner clouds
	const cloud1 = document.createElement('div');
	cloud1.className = 'cloud-effect cloud-1';
	cloud1.innerHTML = '☁️';
	cloud1.style.top = '80%';
	cloud1.style.left = '10%';
	cloud1.style.animationDelay = '0.5s';
	effectsContainer.appendChild(cloud1);

	const cloud2 = document.createElement('div');
	cloud2.className = 'cloud-effect cloud-2';
	cloud2.innerHTML = '☁️';
	cloud2.style.top = '85%';
	cloud2.style.right = '10%';
	cloud2.style.animationDelay = '2s';
	effectsContainer.appendChild(cloud2);

	// Create stars in corners
	const star1 = document.createElement('div');
	star1.className = 'star-effect star-1';
	star1.innerHTML = '⭐';
	star1.style.top = '15%';
	star1.style.left = '15%';
	star1.style.animationDelay = '1s';
	effectsContainer.appendChild(star1);

	const star2 = document.createElement('div');
	star2.className = 'star-effect star-2';
	star2.innerHTML = '⭐';
	star2.style.top = '20%';
	star2.style.right = '20%';
	star2.style.animationDelay = '3s';
	effectsContainer.appendChild(star2);

	const star3 = document.createElement('div');
	star3.className = 'star-effect star-3';
	star3.innerHTML = '⭐';
	star3.style.bottom = '15%';
	star3.style.left = '20%';
	star3.style.animationDelay = '2.5s';
	effectsContainer.appendChild(star3);

	// Create hearts in bottom corners
	const heart1 = document.createElement('div');
	heart1.className = 'heart-effect heart-1';
	heart1.innerHTML = '💖';
	heart1.style.bottom = '25%';
	heart1.style.left = '5%';
	heart1.style.animationDelay = '1.5s';
	effectsContainer.appendChild(heart1);

	const heart2 = document.createElement('div');
	heart2.className = 'heart-effect heart-2';
	heart2.innerHTML = '💖';
	heart2.style.bottom = '20%';
	heart2.style.right = '5%';
	heart2.style.animationDelay = '3.5s';
	effectsContainer.appendChild(heart2);

	// Add butterflies in top corners
	const butterfly1 = document.createElement('div');
	butterfly1.className = 'heart-effect heart-3';
	butterfly1.innerHTML = '🦋';
	butterfly1.style.top = '25%';
	butterfly1.style.left = '8%';
	butterfly1.style.animationDelay = '2s';
	effectsContainer.appendChild(butterfly1);

	const butterfly2 = document.createElement('div');
	butterfly2.className = 'heart-effect heart-1';
	butterfly2.innerHTML = '🦋';
	butterfly2.style.top = '30%';
	butterfly2.style.right = '8%';
	butterfly2.style.animationDelay = '4s';
	effectsContainer.appendChild(butterfly2);
}

// Infinite scroll functionality
function setupInfiniteScroll() {
	const videoGrid = document.querySelector('.video-grid');
	let isLoading = false;

	window.addEventListener('scroll', () => {
		if (isLoading || mediaFiles.length === 0) return;

		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		const windowHeight = window.innerHeight;
		const documentHeight = document.documentElement.scrollHeight;

		// Check if user scrolled to bottom (with 100px buffer)
		if (scrollTop + windowHeight >= documentHeight - 100) {
			isLoading = true;

			// Add more videos by repeating the existing ones
			appendMoreVideos();

			setTimeout(() => {
				isLoading = false;
			}, 500);
		}
	});
}

function appendMoreVideos() {
	const videoGrid = document.querySelector('.video-grid');

	// Get videos based on current filter
	let videosToShuffle;
	if (currentMainFilter === 'all') {
		videosToShuffle = mediaFiles.filter(media => media.has_thumb && media.thumb_path);
	} else {
		videosToShuffle = videosByMainCategory[currentMainFilter] || [];
	}

	const shuffledMedia = [...videosToShuffle].sort(() => Math.random() - 0.5);

	// Get current number of videos in grid for proper numbering
	const currentVideoCount = videoGrid.children.length;

	// Add the next batch of videos (repeat videos with thumbnails only)
	shuffledMedia.forEach(async (media, index) => {
		const kidFriendlyTitle = generateKidFriendlyTitle();
		const videoCard = document.createElement('div');
		videoCard.className = 'video-card';
		videoCard.onclick = () => playVideo(media.video_path, kidFriendlyTitle);

		const thumbnailUrl = `http://localhost:8080/${media.thumb_path}`;

		videoCard.innerHTML = `
			<div class="video-number">${currentVideoCount + index + 1}</div>
			<div class="video-thumbnail" style="background-image: url('${thumbnailUrl}'); display: flex; align-items: center; justify-content: center;">
				<div class="duration-badge">3:45</div>
				<div class="video-options" onclick="event.stopPropagation(); showVideoOptions('${media.video_path}', '${kidFriendlyTitle}')">⋮</div>
			</div>
			<div class="video-title">${kidFriendlyTitle}</div>
		`;

		videoGrid.appendChild(videoCard);
	});
}

// Show bad videos in a modal
function showBadVideos() {
	const videosWithoutThumbs = window.videosWithoutThumbs || [];

	if (videosWithoutThumbs.length === 0) {
		alert('No videos without thumbnails found!');
		return;
	}

	// Group videos by folder/category
	const videosByCategory = {};
	videosWithoutThumbs.forEach(media => {
		// Extract folder name from path
		const pathParts = media.video_path.split('/');
		const folderName = pathParts[pathParts.length - 2] || 'Unknown'; // Get parent folder

		if (!videosByCategory[folderName]) {
			videosByCategory[folderName] = [];
		}
		videosByCategory[folderName].push(media);
	});

	// Create modal
	const modal = document.createElement('div');
	modal.className = 'bad-videos-modal';

	// Create category navigation
	const categories = Object.keys(videosByCategory).sort();
	const categoryLinksHTML = categories.map(category => {
		const count = videosByCategory[category].length;
		return `<button class="category-link" onclick="showCategoryVideos('${category}')" data-category="${category}">
			${category} (${count})
		</button>`;
	}).join('');

	// Create "All Videos" view initially
	let videoListHTML = '';
	categories.forEach(category => {
		videoListHTML += `<div class="category-section" data-category="${category}">
			<h4 class="category-header">${category} (${videosByCategory[category].length} videos)</h4>`;

		videosByCategory[category].forEach(media => {
			const kidFriendlyTitle = generateKidFriendlyTitle();
			const fileName = media.video_path.split('/').pop();
			videoListHTML += `
				<div class="bad-video-item" onclick="playVideo('${media.video_path}', '${kidFriendlyTitle}'); closeBadVideosModal();">
					<div class="bad-video-icon">🎬</div>
					<div class="bad-video-info">
						<div class="bad-video-title">${kidFriendlyTitle}</div>
						<div class="bad-video-filename">${fileName}</div>
					</div>
					<div class="category-tag">${category}</div>
				</div>
			`;
		});
		videoListHTML += '</div>';
	});

	modal.innerHTML = `
		<div class="bad-videos-content">
			<div class="bad-videos-header">
				<h3>Videos Without Thumbnails (${videosWithoutThumbs.length})</h3>
				<button onclick="closeBadVideosModal()" class="close-bad-videos">✕</button>
			</div>
			<div class="category-navigation">
				<button class="category-link active" onclick="showAllCategories()">All Videos</button>
				${categoryLinksHTML}
			</div>
			<div class="bad-videos-list" id="badVideosList">
				${videoListHTML}
			</div>
			<div class="bad-videos-footer">
				<p>💡 Tip: Run <code>./generate_thumbnails.sh</code> to create thumbnails for these videos!</p>
			</div>
		</div>
	`;

	// Add modal styles
	modal.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	`;

	const content = modal.querySelector('.bad-videos-content');
	content.style.cssText = `
		background: white;
		padding: 20px;
		border-radius: 10px;
		max-width: 800px;
		max-height: 80vh;
		overflow-y: auto;
		color: #333;
	`;

	const header = modal.querySelector('.bad-videos-header');
	header.style.cssText = `
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		border-bottom: 2px solid #eee;
		padding-bottom: 10px;
	`;

	// Style category navigation
	const categoryNav = modal.querySelector('.category-navigation');
	categoryNav.style.cssText = `
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 20px;
		padding-bottom: 15px;
		border-bottom: 1px solid #eee;
	`;

	const categoryLinks = modal.querySelectorAll('.category-link');
	categoryLinks.forEach(link => {
		link.style.cssText = `
			padding: 8px 12px;
			background: #f0f0f0;
			border: none;
			border-radius: 20px;
			cursor: pointer;
			transition: all 0.2s;
			font-size: 0.85rem;
			font-weight: 500;
		`;
		link.addEventListener('mouseenter', () => {
			if (!link.classList.contains('active')) {
				link.style.background = '#e0e0e0';
			}
		});
		link.addEventListener('mouseleave', () => {
			if (!link.classList.contains('active')) {
				link.style.background = '#f0f0f0';
			}
		});
	});

	// Style active category link
	const activeLink = modal.querySelector('.category-link.active');
	if (activeLink) {
		activeLink.style.background = '#4CAF50';
		activeLink.style.color = 'white';
	}

	// Style category headers
	const categoryHeaders = modal.querySelectorAll('.category-header');
	categoryHeaders.forEach(header => {
		header.style.cssText = `
			color: #2196F3;
			font-size: 1.1rem;
			margin: 20px 0 10px 0;
			padding: 8px 0;
			border-bottom: 2px solid #2196F3;
			font-weight: 600;
		`;
	});

	const items = modal.querySelectorAll('.bad-video-item');
	items.forEach(item => {
		item.style.cssText = `
			display: flex;
			align-items: center;
			padding: 12px;
			margin: 8px 0;
			background: #f9f9f9;
			border-radius: 8px;
			cursor: pointer;
			transition: background 0.2s;
			position: relative;
		`;
		item.addEventListener('mouseenter', () => item.style.background = '#e0e0e0');
		item.addEventListener('mouseleave', () => item.style.background = '#f9f9f9');
	});

	// Style category tags
	const categoryTags = modal.querySelectorAll('.category-tag');
	categoryTags.forEach(tag => {
		tag.style.cssText = `
			position: absolute;
			top: 8px;
			right: 8px;
			background: #2196F3;
			color: white;
			padding: 4px 8px;
			border-radius: 12px;
			font-size: 0.7rem;
			font-weight: 500;
		`;
	});

	const icons = modal.querySelectorAll('.bad-video-icon');
	icons.forEach(icon => {
		icon.style.cssText = `
			font-size: 2rem;
			margin-right: 15px;
		`;
	});

	const titles = modal.querySelectorAll('.bad-video-title');
	titles.forEach(title => {
		title.style.cssText = `
			font-weight: bold;
			margin-bottom: 4px;
		`;
	});

	const filenames = modal.querySelectorAll('.bad-video-filename');
	filenames.forEach(filename => {
		filename.style.cssText = `
			font-size: 0.8rem;
			color: #666;
			font-family: monospace;
		`;
	});

	const footer = modal.querySelector('.bad-videos-footer');
	footer.style.cssText = `
		margin-top: 20px;
		padding-top: 15px;
		border-top: 2px solid #eee;
		text-align: center;
		color: #666;
		font-size: 0.9rem;
	`;

	const closeBtn = modal.querySelector('.close-bad-videos');
	closeBtn.style.cssText = `
		background: #ff6b6b;
		color: white;
		border: none;
		border-radius: 50%;
		width: 30px;
		height: 30px;
		cursor: pointer;
		font-size: 1rem;
	`;

	document.body.appendChild(modal);
}

// Close bad videos modal
function closeBadVideosModal() {
	const modal = document.querySelector('.bad-videos-modal');
	if (modal) {
		document.body.removeChild(modal);
	}
}

// Show all categories
function showAllCategories() {
	const sections = document.querySelectorAll('.category-section');
	sections.forEach(section => {
		section.style.display = 'block';
	});

	// Update active state
	const links = document.querySelectorAll('.category-link');
	links.forEach(link => {
		link.classList.remove('active');
		link.style.background = '#f0f0f0';
		link.style.color = 'initial';
	});

	const allLink = document.querySelector('.category-link[onclick="showAllCategories()"]');
	if (allLink) {
		allLink.classList.add('active');
		allLink.style.background = '#4CAF50';
		allLink.style.color = 'white';
	}
}

// Show specific category videos
function showCategoryVideos(categoryName) {
	const sections = document.querySelectorAll('.category-section');
	sections.forEach(section => {
		if (section.dataset.category === categoryName) {
			section.style.display = 'block';
		} else {
			section.style.display = 'none';
		}
	});

	// Update active state
	const links = document.querySelectorAll('.category-link');
	links.forEach(link => {
		link.classList.remove('active');
		link.style.background = '#f0f0f0';
		link.style.color = 'initial';
	});

	const activeLink = document.querySelector(`[data-category="${categoryName}"]`);
	if (activeLink) {
		activeLink.classList.add('active');
		activeLink.style.background = '#4CAF50';
		activeLink.style.color = 'white';
	}
}

// Make functions globally available
window.showAllCategories = showAllCategories;
window.showCategoryVideos = showCategoryVideos;

// Function to generate random sky elements
function generateRandomSkyElements() {
	// Skip complex background generation on mobile devices
	if (window.innerWidth <= 480) {
		return; // Mobile devices get simple gradients via CSS
	}

	// Generate random positions for celestial objects (avoiding center area for visibility)
	function getRandomPosition() {
		const positions = [];
		const centerAvoidZone = { x: [40, 60], y: [40, 60] }; // Avoid center 40-60% area

		for (let i = 0; i < 15; i++) { // Generate 15 different positions
			let x, y;
			do {
				x = Math.floor(Math.random() * 95) + 5; // 5% to 95%
				y = Math.floor(Math.random() * 90) + 5; // 5% to 90%
			} while (
				x >= centerAvoidZone.x[0] && x <= centerAvoidZone.x[1] &&
				y >= centerAvoidZone.y[0] && y <= centerAvoidZone.y[1]
			);
			positions.push({ x, y });
		}
		return positions;
	}

	const positions = getRandomPosition();

	// Generate CSS for day theme (sun + clouds)
	const sunPos = positions[0];
	const dayThemeCSS = `
		body::before {
			background-image:
				/* Sun at random position */
				radial-gradient(circle 45px at ${sunPos.x}% ${sunPos.y}%, rgba(255, 223, 0, 1) 0%, rgba(255, 193, 7, 0.9) 30%, rgba(255, 235, 59, 0.7) 50%, rgba(255, 248, 225, 0.4) 70%, transparent 85%),
				radial-gradient(circle 35px at ${sunPos.x}% ${sunPos.y}%, rgba(255, 235, 59, 0.8) 0%, rgba(255, 248, 225, 0.5) 40%, transparent 65%),
				
				/* Clouds at random positions */
				${positions.slice(1, 10).map((pos, index) => {
		const sizes = [
			[80, 45], [60, 35], [70, 40], [50, 30], [40, 25],
			[75, 50], [55, 35], [65, 40], [85, 50]
		];
		const [width, height] = sizes[index] || [60, 35];
		const opacity = 0.7 + Math.random() * 0.2;
		return `radial-gradient(ellipse ${width}px ${height}px at ${pos.x}% ${pos.y}%, rgba(255, 255, 255, ${opacity}) 0%, rgba(255, 255, 255, ${opacity * 0.7}) 40%, rgba(255, 255, 255, ${opacity * 0.3}) 70%, transparent 85%)`;
	}).join(',\n\t\t\t\t')};
		}`;

	// Generate CSS for night theme (moon + planets + stars)
	const moonPos = positions[0];
	const planetPositions = positions.slice(1, 4);
	const starPositions = positions.slice(4, 15);

	const nightThemeCSS = `
		body.night-theme::before {
			background-image:
				/* Moon at random position */
				radial-gradient(circle 60px at ${moonPos.x}% ${moonPos.y}%, rgba(255, 255, 235, 1) 0%, rgba(255, 255, 235, 0.95) 25%, rgba(255, 255, 235, 0.8) 50%, rgba(255, 255, 235, 0.4) 75%, transparent 90%),
				radial-gradient(circle 55px at ${moonPos.x}% ${moonPos.y}%, rgba(248, 248, 220, 0.9) 0%, rgba(248, 248, 220, 0.6) 40%, transparent 65%),
				radial-gradient(circle 45px at ${moonPos.x}% ${moonPos.y}%, rgba(255, 255, 240, 0.7) 0%, rgba(255, 255, 240, 0.3) 50%, transparent 70%),
				
				/* Planets at random positions */
				/* Jupiter */
				radial-gradient(circle 25px at ${planetPositions[0].x}% ${planetPositions[0].y}%, rgba(255, 165, 0, 0.9) 0%, rgba(255, 140, 0, 0.7) 40%, rgba(255, 165, 0, 0.4) 70%, transparent 85%),
				radial-gradient(circle 20px at ${planetPositions[0].x}% ${planetPositions[0].y}%, rgba(255, 180, 50, 0.8) 0%, rgba(255, 200, 100, 0.5) 50%, transparent 70%),
				
				/* Mars */
				radial-gradient(circle 15px at ${planetPositions[1].x}% ${planetPositions[1].y}%, rgba(205, 92, 92, 0.9) 0%, rgba(139, 69, 19, 0.7) 45%, rgba(205, 92, 92, 0.3) 75%, transparent 85%),
				radial-gradient(circle 12px at ${planetPositions[1].x}% ${planetPositions[1].y}%, rgba(255, 99, 71, 0.7) 0%, rgba(255, 140, 100, 0.4) 60%, transparent 80%),
				
				/* Venus */
				radial-gradient(circle 12px at ${planetPositions[2].x}% ${planetPositions[2].y}%, rgba(255, 255, 224, 0.95) 0%, rgba(255, 248, 220, 0.8) 40%, rgba(255, 255, 224, 0.4) 70%, transparent 85%),
				radial-gradient(circle 9px at ${planetPositions[2].x}% ${planetPositions[2].y}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 240, 0.5) 50%, transparent 75%),
				
				/* Bright Stars at random positions */
				${starPositions.map((pos, index) => {
		const sizes = [3, 2.5, 3, 2.5, 3, 2, 2, 2, 2, 1.5, 1];
		const size = sizes[index] || 1;
		const opacity = 0.8 + Math.random() * 0.2;
		return `radial-gradient(circle ${size}px at ${pos.x}% ${pos.y}%, rgba(255, 255, 255, ${opacity}) 0%, rgba(255, 255, 255, ${opacity * 0.6}) 40%, transparent 70%)`;
	}).join(',\n\t\t\t\t')},
				
				/* Additional scattered stars - INCREDIBLE GALAXY-LIKE STAR FIELD! */
				${Array.from({ length: 850 }, () => {
		const x = Math.floor(Math.random() * 95) + 5;
		const y = Math.floor(Math.random() * 90) + 5;
		const size = 0.3 + Math.random() * 1.4; // Maximum variety of sizes
		const opacity = 0.15 + Math.random() * 0.8; // Full brightness spectrum
		return `radial-gradient(circle ${size}px at ${x}% ${y}%, rgba(255, 255, 255, ${opacity}) 0%, transparent 50%)`;
	}).join(',\n\t\t\t\t')};
		}`;

	// Generate CSS for video player backgrounds
	const videoPlayerDayCSS = `
		.video-player-page::before {
			background-image:
				/* Sun at random position */
				radial-gradient(circle 45px at ${sunPos.x}% ${sunPos.y}%, rgba(255, 223, 0, 1) 0%, rgba(255, 193, 7, 0.9) 30%, rgba(255, 235, 59, 0.7) 50%, rgba(255, 248, 225, 0.4) 70%, transparent 85%),
				radial-gradient(circle 35px at ${sunPos.x}% ${sunPos.y}%, rgba(255, 235, 59, 0.8) 0%, rgba(255, 248, 225, 0.5) 40%, transparent 65%),
				
				/* Clouds at random positions */
				${positions.slice(1, 8).map((pos, index) => {
		const sizes = [
			[80, 45], [60, 35], [70, 40], [50, 30], [40, 25], [75, 50], [55, 35]
		];
		const [width, height] = sizes[index] || [60, 35];
		const opacity = 0.7 + Math.random() * 0.2;
		return `radial-gradient(ellipse ${width}px ${height}px at ${pos.x}% ${pos.y}%, rgba(255, 255, 255, ${opacity}) 0%, rgba(255, 255, 255, ${opacity * 0.7}) 40%, rgba(255, 255, 255, ${opacity * 0.3}) 70%, transparent 85%)`;
	}).join(',\n\t\t\t\t')};
		}`;

	const videoPlayerNightCSS = `
		body.night-theme .video-player-page::before {
			background-image:
				/* Moon at random position */
				radial-gradient(circle 60px at ${moonPos.x}% ${moonPos.y}%, rgba(255, 255, 235, 1) 0%, rgba(255, 255, 235, 0.95) 25%, rgba(255, 255, 235, 0.8) 50%, rgba(255, 255, 235, 0.4) 75%, transparent 90%),
				radial-gradient(circle 55px at ${moonPos.x}% ${moonPos.y}%, rgba(248, 248, 220, 0.9) 0%, rgba(248, 248, 220, 0.6) 40%, transparent 65%),
				radial-gradient(circle 45px at ${moonPos.x}% ${moonPos.y}%, rgba(255, 255, 240, 0.7) 0%, rgba(255, 255, 240, 0.3) 50%, transparent 70%),
				
				/* Planets at random positions */
				radial-gradient(circle 25px at ${planetPositions[0].x}% ${planetPositions[0].y}%, rgba(255, 165, 0, 0.9) 0%, rgba(255, 140, 0, 0.7) 40%, rgba(255, 165, 0, 0.4) 70%, transparent 85%),
				radial-gradient(circle 20px at ${planetPositions[0].x}% ${planetPositions[0].y}%, rgba(255, 180, 50, 0.8) 0%, rgba(255, 200, 100, 0.5) 50%, transparent 70%),
				radial-gradient(circle 15px at ${planetPositions[1].x}% ${planetPositions[1].y}%, rgba(205, 92, 92, 0.9) 0%, rgba(139, 69, 19, 0.7) 45%, rgba(205, 92, 92, 0.3) 75%, transparent 85%),
				radial-gradient(circle 12px at ${planetPositions[1].x}% ${planetPositions[1].y}%, rgba(255, 99, 71, 0.7) 0%, rgba(255, 140, 100, 0.4) 60%, transparent 80%),
				radial-gradient(circle 12px at ${planetPositions[2].x}% ${planetPositions[2].y}%, rgba(255, 255, 224, 0.95) 0%, rgba(255, 248, 220, 0.8) 40%, rgba(255, 255, 224, 0.4) 70%, transparent 85%),
				radial-gradient(circle 9px at ${planetPositions[2].x}% ${planetPositions[2].y}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 240, 0.5) 50%, transparent 75%),
				
				/* Bright Stars at random positions */
				${starPositions.slice(0, 8).map((pos, index) => {
		const sizes = [3, 2.5, 3, 2.5, 3, 2, 2, 2];
		const size = sizes[index] || 2;
		const opacity = 0.8 + Math.random() * 0.2;
		return `radial-gradient(circle ${size}px at ${pos.x}% ${pos.y}%, rgba(255, 255, 255, ${opacity}) 0%, rgba(255, 255, 255, ${opacity * 0.6}) 40%, transparent 70%)`;
	}).join(',\n\t\t\t\t')},
				
				/* Additional scattered stars for video player - EPIC DENSE STAR FIELD! */
				${Array.from({ length: 500 }, () => {
		const x = Math.floor(Math.random() * 95) + 5;
		const y = Math.floor(Math.random() * 90) + 5;
		const size = 0.3 + Math.random() * 1.2; // Great variety of sizes
		const opacity = 0.2 + Math.random() * 0.7; // Wide brightness range
		return `radial-gradient(circle ${size}px at ${x}% ${y}%, rgba(255, 255, 255, ${opacity}) 0%, transparent 50%)`;
	}).join(',\n\t\t\t\t')};
		}`;

	// Apply the generated CSS
	const existingStyle = document.getElementById('random-sky-style');
	if (existingStyle) {
		existingStyle.remove();
	}

	const styleElement = document.createElement('style');
	styleElement.id = 'random-sky-style';
	styleElement.innerHTML = dayThemeCSS + '\n' + nightThemeCSS + '\n' + videoPlayerDayCSS + '\n' + videoPlayerNightCSS;
	document.head.appendChild(styleElement);
}

// Load videos when page loads
document.addEventListener('DOMContentLoaded', function () {
	generateRandomSkyElements();
	applyTheme(); // Apply saved theme or default to night
	fetchVideos();
	setupInfiniteScroll();
});
