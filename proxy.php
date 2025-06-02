<?php
header("Access-Control-Allow-Origin: *");
$apiKey = $_GET['apiKey'];
$url = "https://smspool.net/api/request?key=$apiKey&country=US&service=WhatsApp";
echo file_get_contents($url);
