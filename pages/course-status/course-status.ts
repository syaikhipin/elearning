import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { Content,NavController, NavParams, ModalController,LoadingController, AlertController,Platform, Slides,ToastController } from 'ionic-angular';
import {SafeResourceUrl, DomSanitizer} from '@angular/platform-browser';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';


import { SearchPage } from '../search/search';
import { CoursePage } from '../course/course';
import { ReviewCoursePage } from '../reviewcourse/reviewcourse';
import { ProfilePage } from '../profile/profile';

import { FriendlytimeComponent } from '../../components/friendlytime/friendlytime';
import { QuestionComponent } from '../../components/question/question';
import { TimerComponent } from '../../components/timer/timer';

import { Course } from '../../models/course';
import { Activity } from '../../models/activity';
import { ActivityMeta } from '../../models/activity';
import { User } from '../../models/user';
import { CourseStatus } from '../../models/status';


import { CourseService } from '../../services/course';
import { UserService } from '../../services/users';
import { CourseStatusService } from '../../services/status';
import { ConfigService } from '../../services/config';
import { QuizService } from '../../services/quiz';
import { ActivityService } from '../../services/activity';

import { Storage } from '@ionic/storage';

import {AbsoluteDrag} from '../../components/absolute-drag/absolute-drag';
import {PinchZoomDirective} from '../../directives/pinch-zoom.directive';

import {VgAPI} from 'videogular2/core';

import { SafeHtmlPipe } from "../../pipes/orderby";
import { SafePipe } from "../../pipes/orderby";

import { UnitCommentPage } from '../unitcomment/unitcomment';

import { UploadAssignmentPage } from '../uploadassignment/uploadassignment';
import { UploadAssignmentService } from "../../services/upload_assignment"; 



@Component({
    selector: 'page-course-status',
    templateUrl: 'course-status.html',
})
export class CourseStatusPage implements OnInit{

  unitCommentPage=UnitCommentPage;
  uploadAssignmentPage=UploadAssignmentPage;
 

  isLoggedIn: boolean = true;
  coursestatus:CourseStatus;
  course:any;
  user: any;
  browser: any;
  saving:boolean=false;
  current_i:number;
  quiz_start:boolean;
  quiz_saved: boolean=false;

  assignmentTimer:any;

  proggress_percentage:number;
  timelineactive:number = 1;
  current_time:any;

  iframeUrls: SafeResourceUrl[]=[];
  api:VgAPI;
  audio:any;

  

  @ViewChild('CourseStatusItems') courseStatusItems: Slides;
  @ViewChild('QuizQuestions') quizQuestions: Slides;
  @ViewChild(Content) content: Content;

    constructor(public navCtrl: NavController, public navParams: NavParams,
        private modalCtrl: ModalController,private alert:AlertController,
        private userService:UserService,
        private courseStatusService:CourseStatusService,
        private config:ConfigService,
        private toastCtrl: ToastController,
        private storage: Storage,
        private courseService:CourseService,
        private quizService:QuizService,
        private activityService:ActivityService,
        private loadingCtrl:LoadingController,
        private domSanitizer: DomSanitizer,
        public upload_assignment:UploadAssignmentService,
        private iab: InAppBrowser,
        private transfer: FileTransfer,
        private file: File,
        public fileTransfer: FileTransferObject) {

    }

    ngOnInit(){      
        

      
        let data:any;

        data  = this.navParams.data;

        if(data.hasOwnProperty('course')){
            this.storage.set('lastcourse',data);
        }else{
            data = this.courseService.getLastCourse();
        }
        
        this.quizService.getQuizStarted();

         this.course = data['course'];
         this.user = data['user'];

        this.current_i      = 0;

        if(this.course){
            if(!('name' in this.course)){
              this.storage.get('course_'+this.user.id).then(res=>{
                if(res && Array.isArray(res)){
                  for(let k=0;k<res.length;k++){
                    if(this.course.id == res[k].id){
                      this.course = res[k];
                    }
                  }
                }
              });
            }

            let progress:number = parseFloat(this.course.user_progress);
            this.coursestatus = {
                 'course_id':this.course.id,
                 'user_id':this.user.id,
                 'progress':Number(progress),
                 'current_unit_key': 0,
                 'courseitems':[],
                 'status':this.course.user_status,
            };

            let loading = this.loadingCtrl.create({
                content: '<img src="assets/images/bubbles.svg">',
                duration: 15000,//this.config.get_translation('loadingresults'),
                spinner:'hide',
                showBackdrop:true,

            });
            loading.present();
            this.courseStatusService.getCourseStatus(this.coursestatus).subscribe(res=>{
              this.coursestatus = res; 
              
              loading.dismiss();
            });
            if(this.course.status == 1){
                var a = {
                    'user_id':this.user.id,
                    'type':'start_course',
                    'action':'start_course',
                    'content':this.config.get_translation('user_started_course')+' '+this.course.name,
                    'item_id':this.coursestatus.course_id,
                    'secondary_item_id':this.coursestatus.courseitems[this.current_i].id,
                };
                this.activityService.addActivity(a);
            }
        }
        
     }
    

    ionViewDidLoad(){

      if(this.course.id != this.coursestatus.course_id){ // New course has been loaded
        console.log('New course to be loaded');
        let progress:number = parseFloat(this.course.user_progress);
        this.coursestatus = {
             'course_id':this.course.id,
             'user_id':this.user.id,
             'progress':Number(progress),
             'current_unit_key': 0,
             'courseitems':[],
             'status':this.course.user_status,
        };

        let loading = this.loadingCtrl.create({
            content: '<img src="assets/images/bubbles.svg">',
            duration: 15000,//this.config.get_translation('loadingresults'),
            spinner:'hide',
            showBackdrop:true,

        });
        loading.present();
        this.get_progress();
        this.courseStatusService.getCourseStatus(this.coursestatus).subscribe(res=>{
          this.coursestatus = res; 


          this.get_progress();
          loading.dismiss();
        });
      }
    
    }

     ionViewWillUnload(){

    }

    
    openSearch(){
        let modal = this.modalCtrl.create(SearchPage);
        modal.present();
    }

    toggleTimeline(){
      if(this.timelineactive){
        this.timelineactive = 0;
      }else{
            this.get_progress();
            this.timelineactive=1;
      }
    }

    get_progress(){
        let unit_count:number = 0;
        for(let k=0; k<this.coursestatus.courseitems.length;k++){
            if(this.coursestatus.courseitems[k].type != 'section'){unit_count++;}
        }  
        if(unit_count == 0){unit_count=1;}
        //Get progress
        this.coursestatus['progress'] = 0;
        for(let i=0;i<this.coursestatus.courseitems.length;i++){
            if(this.coursestatus.courseitems[i].status){
                this.coursestatus.progress = this.coursestatus.progress + parseFloat((100/unit_count).toFixed(2));
                if(this.coursestatus.progress > 100){this.coursestatus.progress = 100;}
            }
        }
        if(this.userService &&  this.userService.profile &&this.userService.profile.data['courses']){
          for(let i=0;i<this.userService.profile.data['courses'].length;i++){
            if(this.userService.profile.data['courses'][i].id == this.coursestatus.course_id){
              this.userService.profile.data['courses'][i].user_progress = this.coursestatus.progress;
            }
          }
        }

    }

    getsection(key:number){
      for(let i=key;i>=0;i--){
        if(this.coursestatus.courseitems[i].type == 'section'){
          return this.coursestatus.courseitems[i].title;
        }
      }
      return '';
    }

    getsectionduration(key:number){
      let duration:number = 0;
      for(let i=key+1;i <= this.coursestatus.courseitems.length;i++){
        if(this.coursestatus.courseitems[i]){
          if(this.coursestatus.courseitems[i].type == 'section'){
            return duration;
          }else{
            duration = duration+this.coursestatus.courseitems[i].duration;
          }
        }
      }
    }

    in_section(unitkey:number,sectionkey:number){
      for(let i=unitkey;i>sectionkey;i--){
        if(this.coursestatus.courseitems[i].type == 'section')
          return false;
      }
      return true;
    }

    forceReload(){
      
      let loading = this.loadingCtrl.create({
          content: '<img src="assets/images/bubbles.svg">',//this.config.get_translation('loadingresults'),
          spinner:'hide',
          showBackdrop:true,
          duration: 15000,
      });
      loading.present();

      let index = this.courseStatusItems.getActiveIndex();
      this.config.removeFromTracker('statusitems',this.coursestatus.courseitems[index].id);
      this.courseStatusService.getCourseStatusItem(this.coursestatus,index).subscribe(res=>{
        this.coursestatus = res;
        console.log(JSON.stringify(res));
              console.log('----------'+this.coursestatus.courseitems[this.current_i].hasOwnProperty('meta')+'###'+this.coursestatus.courseitems[this.current_i].meta.hasOwnProperty('audio'));
              console.log(res);

                if( 1 ){
                    console.log('#1');
                    if(this.coursestatus.courseitems[this.current_i].meta.audio.length){
                        console.log('#2');
                        this.coursestatus.courseitems[this.current_i].meta.audio.map((audio,index)=>{
                            
                            console.log('#3 ->'+this.coursestatus.courseitems[this.current_i].meta.audio[index]);
                            this.getLocalAudio(this.coursestatus.courseitems[this.current_i].meta.audio[index]).then((url)=>{
                                this.coursestatus.courseitems[this.current_i].meta['audio'][index] = url;
                                this.courseStatusService.updateCourseStatus(this.coursestatus);
                                console.log('YAY '+url);
                            });
                        });
                    }
                }
        this.checkQuizStatus();
        this.checkAssignmentStatus();
        this.get_progress();
        loading.dismiss();

      });


    }

    loadAssignment(assignment,unit_id){

      if(this.coursestatus.courseitems[this.current_i].meta.hasOwnProperty('assignments')){
        let i = this.coursestatus.courseitems[this.current_i].meta.assignments.findIndex((ass)=>{return ass.id === assignment.id });

        if(assignment.hasOwnProperty('flag') && assignment.flag <= 1 ){
          this.coursestatus.courseitems[this.current_i].meta.assignments[i]['flag'] = 1 ;  
          this.courseStatusService.updateCourseStatus(this.coursestatus);
        }
        
      }
      assignment['current_unit_id']=unit_id;
      assignment['coursestatus']=JSON.stringify(this.coursestatus);
      assignment['current_i']=this.current_i;
      this.navCtrl.push(UploadAssignmentPage,assignment);
    }

    checkAssignmentStatus(){  
      this.upload_assignment.assignments=this.coursestatus.courseitems[this.current_i].meta.assignments;
    }

    iframeSanitizer(iframe){
      return this.domSanitizer.bypassSecurityTrustResourceUrl(iframe);
    }

    onSlideChanged(){

      console.log('on slide change top');
      this.upload_assignment.assignments=[];  // done for when we change unit all assignment should be removed first
      let index = this.courseStatusItems.getActiveIndex();
      console.log(index);
      this.content.scrollToTop();

        if(this.coursestatus.courseitems.length > index){
            this.current_i      = index;

            if(this.coursestatus.courseitems[index].type != 'section'){
                
                if(!this.coursestatus.courseitems[index].content || !this.coursestatus.courseitems[index].meta.access){
                    let loading = this.loadingCtrl.create({
                        content: '<img src="assets/images/bubbles.svg">',
                        duration: 15000,//this.config.get_translation('loadingresults'),
                        spinner:'hide',
                        showBackdrop:true,

                    });
                    loading.present();
                    let temp_course_items:any;
                    temp_course_items = JSON.parse(JSON.stringify(this.coursestatus));
                    for(let i=0;i<(temp_course_items.courseitems.length);i++){
                        if(temp_course_items.courseitems[i].meta && !temp_course_items.courseitems[i].meta.access){
                            temp_course_items.courseitems[i].content = '';
                        }
                    }
                    this.courseStatusService.getCourseStatusItem(temp_course_items,index).subscribe(res=>{
                        this.coursestatus = res;
                       
                        this.checkQuizStatus();
                        this.checkAssignmentStatus();
                        console.log('on slide change');
                       

                        this.get_progress();
                        loading.dismiss();
                        if(this.coursestatus.courseitems[index].type == 'unit' && this.config.settings.open_units_in_inappbrowser_auto){
                          if(this.coursestatus.courseitems[index].meta.link){
                            this.openIabunit(this.coursestatus.courseitems[index].meta.link);
                          }
                        }
                    });
                }

                if(this.coursestatus.courseitems[index].status == 0 && this.coursestatus.courseitems[index].type != 'quiz'){
                    if(this.coursestatus.courseitems[index].meta.access == 1){
                        this.coursestatus.courseitems[index].status = 1;
                        this.get_progress();
                        
                        this.courseStatusService.markUnitComplete(this.coursestatus,this.coursestatus.courseitems[index]); 

                    }
                }
                
                if(this.coursestatus.courseitems[index].type == 'quiz'){
                  if(!this.coursestatus.courseitems[index].meta.hasOwnProperty('progress')){
                    this.coursestatus.courseitems[index].meta['progress'] = 0;
                    this.quiz_start = true;
                  }
                }
                
                this.courseStatusService.updateCourseStatus(this.coursestatus);



                if(this.coursestatus.courseitems[index].type == 'unit' && this.config.settings.open_units_in_inappbrowser_auto){
                  console.log('courseitems[index].meta.link');
                  console.log(this.coursestatus.courseitems[index].meta.link);
                  if(this.coursestatus.courseitems[index].meta.link){
                    this.openIabunit(this.coursestatus.courseitems[index].meta.link);
                  }
                }
                
            }
        }
        this.checkAssignmentStatus();
        console.log('on slide change bottom');
    }

    checkQuizStatus(){

        if(this.coursestatus && this.coursestatus.courseitems && typeof this.coursestatus.courseitems[this.current_i].meta != "undefined" && 
            typeof this.coursestatus.courseitems[this.current_i].meta.status != "undefined"){
          
            switch(this.coursestatus.courseitems[this.current_i].meta.status){
                case 0:
                    this.quizService.removeQuizStarted(this.coursestatus.courseitems[this.current_i]);
                break;
                case 1:
                case 2:
                    if('remaining' in this.coursestatus.courseitems[this.current_i]){
                        this.coursestatus.courseitems[this.current_i].duration = this.coursestatus.courseitems[this.current_i].meta.remaining;
                        this.coursestatus.courseitems[this.current_i].duration = this.quizService.getRemainingTimer(this.coursestatus.courseitems[this.current_i].id,this.coursestatus.courseitems[this.current_i].duration);
                    }else{
                        this.coursestatus.courseitems[this.current_i].duration = 0;
                        this.coursestatus.courseitems[this.current_i].content = this.coursestatus.courseitems[this.current_i].meta.completion_message;
                        this.coursestatus.courseitems[this.current_i].meta.status = 3;
                    }
                break;
                case 3:
                    this.quizService.stopTimer(this.coursestatus.courseitems[this.current_i].id);
                    this.coursestatus.courseitems[this.current_i].status=1;
                break;
                case 4:
                    this.quizService.stopTimer(this.coursestatus.courseitems[this.current_i].id);
                    if(this.quizService.quiz_started){
                      this.quizService.quiz_started.push(this.coursestatus.courseitems[this.current_i].id);
                    }
                    this.coursestatus.courseitems[this.current_i].status=1;
                break;
                default:
                    
                break;
            }
        }
        if(this.coursestatus){
          this.courseStatusService.updateCourseStatus(this.coursestatus);
        }
        
    }  


    triggerQuizStart(){
        
        if(typeof this.coursestatus != "undefined" && this.coursestatus.courseitems[this.current_i].meta.status<2){
          this.coursestatus.courseitems[this.current_i].meta.status = 2;
          this.courseStatusService.updateCourseStatus(this.coursestatus);

          var a = {
            'user_id':this.coursestatus.user_id,
            'type':'quiz_start',
            'content':this.config.get_translation('user_quiz_started')+' '+this.coursestatus.courseitems[this.current_i].title,
            'item_id':this.coursestatus.course_id,
            'secondary_item_id':this.coursestatus.courseitems[this.current_i].id,
          };
          this.activityService.addActivity(a);
        }
        
        this.quizService.addQuizStarted(this.coursestatus.courseitems[this.current_i].id);
        this.coursestatus.courseitems[this.current_i].duration = this.quizService.getRemainingTimer(this.coursestatus.courseitems[this.current_i].id,this.coursestatus.courseitems[this.current_i].duration);
        return this.coursestatus.courseitems[this.current_i].meta.status;
        //send post request to update quiz status;
    }

    onQuestionSlide(){
        let index = this.courseStatusItems.getActiveIndex();
        this.content.scrollToTop();
    }


    showQuizControls(){
      if(typeof this.coursestatus != "undefined" && this.coursestatus.courseitems.length > this.current_i){

        if(this.coursestatus.courseitems[this.current_i].type == 'quiz'){
          if("meta" in this.coursestatus.courseitems[this.current_i]){
            if(this.coursestatus.courseitems[this.current_i].meta.status >= 1 && this.coursestatus.courseitems[this.current_i].meta.status < 3){
              this.quiz_start = false;
              return 1;
            }
          }
        }
      }
      return 0;
    }

    triggerQuizSave(){
        this.saving=true;
        this.courseStatusService.saveQuiz(this.coursestatus.courseitems[this.current_i],this.user);
        this.quiz_saved = true;
        this.saving=false; 
    }
    
    triggerQuizSubmit(){
      
      if(this.coursestatus.courseitems[this.current_i] && this.coursestatus.courseitems[this.current_i].type == 'quiz'){
        let markedAll = true;
        let meta2 = this.coursestatus.courseitems[this.current_i].meta;
        
        if(meta2){
          if(this.config.settings.force_mark_all_questions){
            for(let i=0; i < meta2.questions.length; i++){
              if(meta2.questions[i].status <= 0){
                  markedAll = false;
                  break;
              }
            }
            if(markedAll){
              this.processTriggerQuizSubmit();
            }else{
              let markquestionalert = this.alert.create({
                title: this.config.get_translation('markallquestions'),
                buttons: [this.config.get_translation('dismiss')]
              });
              markquestionalert.present();
            }
          }else{
            this.processTriggerQuizSubmit();
          }
        }
      }
    }

    processTriggerQuizSubmit(){
      //Record activity
      let meta2 = this.coursestatus.courseitems[this.current_i].meta;
      var a = {
        'user_id':this.coursestatus.user_id,
        'type':'quiz_submit',
        'content':this.config.get_translation('user_submitted_quiz')+' '+this.coursestatus.courseitems[this.current_i].title,
        'item_id':this.coursestatus.course_id,
        'secondary_item_id':this.coursestatus.courseitems[this.current_i].id,
      };
      this.activityService.addActivity(a);

      //Stop timer
      this.quizService.stopTimer(this.coursestatus.courseitems[this.current_i].id);
      this.quizService.removeQuizStarted(this.coursestatus.courseitems[this.current_i].id);
      

      //Show Result
      if(this.coursestatus.courseitems[this.current_i].meta.auto){
        this.coursestatus.courseitems[this.current_i].meta.status=4;
        this.quizService.addQuizStarted(this.coursestatus.courseitems[this.current_i].id);
        let a = {
          'user_id':this.coursestatus.user_id,
          'type':'quiz_evaluate',
          'content':this.config.get_translation('user_quiz_evaluated')+' '+this.coursestatus.courseitems[this.current_i].title,
          'item_id':this.coursestatus.course_id,
          'secondary_item_id':this.coursestatus.courseitems[this.current_i].id,
          'meta':this.coursestatus.courseitems[this.current_i].meta.questions
        };
        this.activityService.addActivity(a);

      }else{
        this.coursestatus.courseitems[this.current_i].meta.status=3;
      } 

      if(meta2.questions && meta2.questions.length){

        for(let i=0; i < meta2.questions.length; i++){

          if(meta2.questions[i].status < 2){
              meta2.questions[i].status = 2;
          }
        }
      }

      this.courseStatusService.submitQuiz(this.coursestatus,this.current_i);

      this.coursestatus.courseitems[this.current_i].status=1;

      this.courseStatusService.updateCourseStatus(this.coursestatus);
      this.get_progress();
    }

    quizSaved(){
      return this.quiz_saved;
    }

    endQuiz(quiz){
      this.processTriggerQuizSubmit();
    }

    selectedItem(i:number){
      this.timelineactive = 0;
      this.courseStatusItems.slideTo(i, 500);
      this.content.scrollToTop();
    }

    QuestionChecked(question:any,index:number){
      
        this.quiz_saved = false;
        this.updateQuizMeta();
    }

    increaseProgress(question:any,index:number){
      
      let marked_count:number = 0;
      var meta = this.coursestatus.courseitems[this.current_i].meta;
      for(let i=0; i < meta.questions.length; i++){
          if(meta.questions[i].status > 0){
              marked_count++;
          }
      }

      this.coursestatus.courseitems[this.current_i].meta.progress = Math.floor(100*(marked_count/meta.questions.length));

    }

    updateQuizMeta(){

      
        var meta = this.coursestatus.courseitems[this.current_i].meta;

        let marked_count:number = 0;
        let score:number = 0;
        for(let i=0; i < meta.questions.length; i++){
            if(meta.questions[i].status > 0){
                marked_count++;
            }
            score = score + meta.questions[i].user_marks;
        }
        
        this.coursestatus.courseitems[this.current_i].meta.progress = Math.floor(100*(marked_count/meta.questions.length));
        this.coursestatus.courseitems[this.current_i].meta.marks = score;
        this.courseStatusService.updateCourseStatus(this.coursestatus);
    }

    retakeQuiz(){

      
      let loading = this.loadingCtrl.create({
          content: '<img src="assets/images/bubbles.svg">',
          duration: 15000,//this.config.get_translation('loadingresults'),
          spinner:'hide',
          showBackdrop:true,

      });
      loading.present();
      let index = this.courseStatusItems.getActiveIndex();
      this.courseStatusService.retakeQuizService(this.coursestatus,index).subscribe(res=>{
        
        if(res){
          if(res['status']){
          
            this.config.removeFromTracker('statusitems',this.coursestatus.courseitems[index].id);
            this.courseStatusService.getCourseStatusItem(this.coursestatus,index).subscribe(res=>{
              this.coursestatus = res;
              this.quizService.removeQuizStarted(this.coursestatus.courseitems[index].id);
              this.checkQuizStatus();
              this.get_progress();
              if(loading){
                loading.dismiss();
              }

            });
            
            
            /*this.selectedItem(index);*/
            
             
              
          }else{
            let toast = this.toastCtrl.create({
                            message: res.message,
                            duration: 1000,
                            position: 'bottom'
                        });
            toast.present();
          }
        }else{
          let toast = this.toastCtrl.create({
                          message: res.message,
                          duration: 1000,
                          position: 'bottom'
                      });
          toast.present();
        }
      });
    }

    backToCourse(){
      this.navCtrl.push(CoursePage,{'id':this.coursestatus.course_id});
    } 

    reviewCourse(){
        let modal = this.modalCtrl.create(ReviewCoursePage,{'course':this.course});
        modal.present();
    } 

    finishCourse(){
        if(this.coursestatus.progress >= 100){
            
            let loading = this.loadingCtrl.create({
                content: '<img src="assets/images/bubbles.svg">',
                duration: 15000,//this.config.get_translation('loadingresults'),
                spinner:'hide',
                showBackdrop:true,

            });
            loading.present();

            this.storage.get('courses_'+this.coursestatus.user_id).then(courses=>{
           
                if(courses.length){
                    for(let k=0;k<courses.length;k++){
                        if(courses[k].id == this.coursestatus.course_id){
                          
                            courses[k].user_progress = 100;
                            courses[k].user_status = 4;
                            //Update my courses
                            this.storage.set('courses_'+this.coursestatus.user_id,courses);
                        }
                    }
                }   
            });

            this.courseStatusService.finishCourse(this.coursestatus).subscribe(res=>{
              if(res['status']){
                this.navCtrl.push(ProfilePage);
                let options = {
                    title: this.config.get_translation('finish_course'),
                    message: res['message'],
                    cssClass:'finish_course_alert',
                    buttons: [
                        {
                            text: this.config.get_translation('close'),
                            role: 'cancel',
                            handler: () => {
                                
                            }
                        },
                    ]
                };
                let alert = this.alert.create(options);
                alert.present();
              }
              loading.dismiss();
            });
        }else{
            
            let options = {
                title: this.config.get_translation('course_incomplete'),
                inputs: [],
                message: this.config.get_translation('finish_this_course'),
                buttons: [
                    {
                        text: this.config.get_translation('ok'),
                        role: 'cancel',
                        handler: () => {
                            console.log('Cancel clicked');
                        }
                    },
                ]
            };
            let alert = this.alert.create(options);
            alert.present();
        }
    }


    showQuizStart(){

      if(typeof this.coursestatus != "undefined" && this.coursestatus.courseitems[this.current_i]){
        if(this.coursestatus.courseitems[this.current_i].type == 'quiz'){
          return !this.quizService.checkQuizStarted(this.coursestatus.courseitems[this.current_i].id);  
        }
      }
       
       return false;
    }

    onPlayerReady(api:VgAPI) {
        this.api = api;

        this.api.getDefaultMedia().subscriptions.ended.subscribe(
            () => {
                // Set the video to the beginning
                this.api.getDefaultMedia().currentTime = 0;
                console.log('ended');
            }
        );
    }

    openIab(frameUrl){
      this.iab.create(frameUrl, "_blank");
    }

    openIabunit(frameUrl){
      console.log(this.config.settings.units_in_inappbrowser);
      this.browser = this.iab.create(frameUrl+'&access_token='+encodeURIComponent(this.config.settings.access_token), "_blank","location=no");
      this.browser.insertCSS({ code: "header,footer{display:none;}" });

      this.browser.show();
      this.browser.on('exit').subscribe((event) => {
        this.browser.close();
      });
    }

    isObject(obj){
      return typeof obj === 'object';
    }

    gettimediff(time:number){

      let remaining_time = time-  Math.floor(new Date().getTime() / 1000);//this.config.timestamp ;
      return remaining_time;
      

    }

     doRefresh(refresher){
       console.log('do refresher unit');
       let index = this.courseStatusItems.getActiveIndex();

        this.courseStatusService.doRefreshStatus(this.coursestatus,index).subscribe(res=>{
              this.coursestatus = res; 
               this.checkQuizStatus();
               this.checkAssignmentStatus();
              refresher.complete();
              
            });
    }

    getLocalAudio(url) {

        console.log(url);
        console.log('#####');

        return new Promise((resolve)=>{

            this.storage.get(url).then(res=>{
                console.log(res);
                console.log('*');
                if(res){
                  resolve(res);
                }else{
                   //capture name from URL
                    let name = url.substring(url.lastIndexOf('/')+1);
                    let extension  = url.split('.').pop(); 
                    console.log(name);
                    this.fileTransfer.download(url, this.file.dataDirectory + name).then((entry) => {
                        console.log('download complete: ' + entry.toURL());
                        console.dir(entry.bypassSecurityTrustResourceUrl); 
                        this.storage.set(url,entry.toURL());
                        resolve(entry.toURL());
                    }),
                     function(error) {
                     console.log("download error source " + error.source);
                     console.log("download error target " + error.target);
                     console.log("download error code" + error.code);
                      },
                   false, {
                       headers: {
                          "Authorization": "Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=="
                       }
                    }


                }
            });
        });
    }
      

    get_audio(url) {
        let $this=this;
      this.getLocalAudio(url).then((res)=>{
        $this.playAudio(res);
        console.log('get_audio');
        console.log(res);
      });
    }

   
    playAudio(toURL){
        console.log('playAudio');
      this.audio = new Audio();
      this.audio.src =toURL;
      this.audio.load();

      this.audio.play(); 


    }
    pauseAudio(){

      if(this.audio){
        console.log('##');
         this.audio.pause();
      }
    }

}
