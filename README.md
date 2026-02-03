# 🐦 bird-cdn - Fast, Self-Hosted Media Delivery Service

## 🚀 Download Now
[![Download bird-cdn](https://img.shields.io/badge/Download-bird--cdn-brightgreen)](https://github.com/joshua4x/bird-cdn/releases)

## 📄 Description
bird-cdn is a self-hosted Content Delivery Network designed for images and videos. With NGINX edge caching, automatic WebP conversion, on-the-fly image transformation, and a React admin dashboard, it makes media delivery smooth and efficient. 

## 🛠 Features
- **NGINX Edge Caching:** Efficiently caches media content to reduce load times.
- **Automatic WebP Conversion:** Optimizes images automatically for better performance.
- **On-the-Fly Image Transformation:** Adjust images according to your needs.
- **React Admin Dashboard:** Easy management of your media server.

## 💻 System Requirements
- Operating System: Linux or Windows
- Docker installed (for easy setup)
- Minimum 4 GB of RAM
- At least 2 GB of free disk space

## 🌐 Topics
cdl, content-delivery-network, docker, fastapi, grafana, image-optimization, image-processing, minio, nginx, prometheus, s3-storage, self-hosted, video-streaming

## 📥 Download & Install
To get started with bird-cdn, visit the page below to download the latest version:

[Visit this page to download](https://github.com/joshua4x/bird-cdn/releases)

### 📂 Installation Instructions
1. **Download the Release**: Go to the [Releases page](https://github.com/joshua4x/bird-cdn/releases) and choose the latest version.
2. **Extract the Files**: Use a tool like WinRAR or 7-Zip to extract the downloaded files.
3. **Run Docker Compose**:
   - Open your terminal (Command Prompt or PowerShell on Windows).
   - Navigate to the folder where you extracted bird-cdn.
   - Run the command: 
     ```
     docker-compose up
     ```
4. **Access the Admin Dashboard**: Open your web browser and enter `http://localhost:8080`. This will take you to the bird-cdn dashboard.

## ⚙️ Configuration
After installation, you might want to customize your setup. Here’s how:

1. **Edit Configuration File**: Locate the `config.yml` file in the folder where you extracted bird-cdn.
2. **Change Default Settings**: You can modify options like image quality, cache duration, and other parameters.
3. **Restart Docker**: Anytime you make changes to the configuration, restart Docker with the command:
   ```
   docker-compose down
   docker-compose up
   ```

## 📝 Basic Usage
- **Adding Media**: Simply upload your images and videos via the admin dashboard.
- **Transforming Images**: Use the URL parameters to adjust size, format, and quality of images on the fly.

## 🔍 Troubleshooting
If you encounter issues:
- Ensure Docker is running.
- Verify that you followed the installation steps correctly.
- Check the logs for any error messages. They can be found in the terminal where you ran Docker.

For more help, refer to the [Issues section](https://github.com/joshua4x/bird-cdn/issues) in our repository.

## 📑 Conclusion
With bird-cdn, you can easily set up a powerful media delivery system. Follow the steps above, and you will have your own CDN running in no time. Enjoy fast media delivery and streamlined management! 

Don't forget to check out the [Releases page](https://github.com/joshua4x/bird-cdn/releases) for updates and new features!